"""Private CPU evaluator. Inputs and outputs are bounded by the Node worker."""

import argparse
import base64
import json
import sys

import cv2
import numpy as np
import onnxruntime as ort


def normalize(vector):
    vector = vector.reshape(-1).astype("<f4")
    norm = float(np.linalg.norm(vector))
    if vector.size != 128 or not np.isfinite(norm) or norm <= 0.0:
        raise ValueError("face_vector_invalid")
    return vector / norm


def make_matcher(detector_path, recognizer_path):
    cv2.setNumThreads(1)
    detector = cv2.FaceDetectorYN.create(detector_path, "", (320, 320), 0.9, 0.3, 50)
    aligner = cv2.FaceRecognizerSF.create(recognizer_path, "")
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = 1
    session_options.inter_op_num_threads = 1
    session = ort.InferenceSession(recognizer_path, sess_options=session_options, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    def embedding(crop):
        blob = cv2.dnn.blobFromImage(crop, scalefactor=1.0, size=(112, 112), swapRB=True)
        return normalize(session.run(None, {input_name: blob})[0])

    def encode(value):
        if not value:
            return None
        raw = base64.b64decode(value, validate=True)
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None or max(image.shape[:2]) > 640 or min(image.shape[:2]) < 80:
            return None
        height, width = image.shape[:2]
        detector.setInputSize((width, height))
        _, faces = detector.detect(image)
        if faces is None or faces.shape[0] != 1:
            return None
        face = faces[0]
        if min(face[2:4]) < 80:
            return None
        crop = aligner.alignCrop(image, face)
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        if not 40 <= float(gray.mean()) <= 215 or float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 35:
            return None
        return embedding(crop)

    # Validate the model's actual CPU inference shape without a real face.
    embedding(np.full((112, 112, 3), 128, dtype=np.uint8))
    return encode


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("detector")
    parser.add_argument("recognizer")
    parser.add_argument("mismatch_threshold", type=float)
    parser.add_argument("match_threshold", type=float)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not -1 <= args.mismatch_threshold < args.match_threshold <= 1:
        raise ValueError("face_threshold_invalid")

    encode = make_matcher(args.detector, args.recognizer)
    if args.check:
        print(json.dumps({"ready": True, "runtime": [cv2.__version__, ort.__version__, np.__version__]}))
        return

    data = json.loads(sys.stdin.read(1_500_000))
    template = data.get("template")
    generated = None
    if template:
        enrolled = normalize(np.frombuffer(base64.b64decode(template, validate=True), dtype="<f4"))
    else:
        enrolled = encode(data.get("reference"))
        if enrolled is not None:
            generated = base64.b64encode(enrolled.tobytes()).decode("ascii")
    punch = encode(data.get("punch"))
    outcome = "inconclusive"
    if enrolled is not None and punch is not None:
        cosine = float(np.dot(enrolled, punch))
        if cosine < args.mismatch_threshold:
            outcome = "mismatch"
        elif cosine >= args.match_threshold:
            outcome = "match"
    print(json.dumps({"outcome": outcome, "template": generated}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never echo frames, templates, scores or exception details.
        sys.exit(1)
