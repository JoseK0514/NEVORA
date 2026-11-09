"""Check the built app on two invocation-owned loopback servers, with no credentials."""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import time
import urllib.error
import urllib.request

root = Path.cwd()
out = root / "docs/handoffs/business-backend-repairs-20261109"
if not (root / ".next/BUILD_ID").is_file():
    raise RuntimeError("Build this exact source first")
if os.environ.get("DATABASE_URL") or any(p.name != ".env.example" for p in root.glob(".env*")):
    raise RuntimeError("Refusing application credentials or local environment files")
candidate = "https://nevora-owned-candidate.vercel.app"
stable = "https://nevora-owned-stable.vercel.app"
results = []

for environment in ["preview", "production"]:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = {"PATH": os.environ["PATH"], "NODE_ENV": "production", "NEXT_TELEMETRY_DISABLED": "1",
           "NEVORA_WORKSPACE_MODE": "single_company", "FUEL_PORTAL_ORIGIN": stable,
           "VERCEL": "1", "VERCEL_ENV": environment, "VERCEL_URL": candidate.removeprefix("https://")}
    with (out / ("http-" + environment + ".log")).open("w") as log:
        process = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", str(port)],
                                   env=env, stdout=log, stderr=log, start_new_session=True)
        try:
            deadline = time.monotonic() + 20
            while True:
                if process.poll() is not None:
                    raise RuntimeError("Owned server exited during startup")
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                        break
                except OSError:
                    if time.monotonic() > deadline:
                        raise RuntimeError("Owned server startup deadline")
                    time.sleep(0.05)
            cases = [("/api/timecards", candidate, 401 if environment == "preview" else 403),
                     ("/api/timecards", stable, 401), ("/api/timecards", "https://other.test", 403),
                     ("/api/timecards", None, 403), ("/api/manager/time-off-staffing", candidate, 401 if environment == "preview" else 403)]
            for path, origin, expected in cases:
                headers = {"Host": candidate.removeprefix("https://"), "X-Forwarded-Proto": "https", "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin",
                           "X-Nevora-Timecards": "1", "X-Nevora-Leave-Staffing": "1"}
                if origin:
                    headers["Origin"] = origin
                request = urllib.request.Request("http://127.0.0.1:" + str(port) + path, headers=headers, data=b"{}", method="POST")
                try:
                    response = urllib.request.urlopen(request, timeout=10)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    status = response.status
                    failure = response.headers.get("x-nevora-failure")
                    body = response.read(2048).decode()
                expected_failure = "authentication_required" if expected == 401 else "origin_mismatch"
                result = {"environment": environment, "path": path, "originCase": "missing" if origin is None else "candidate" if origin == candidate else "configured" if origin == stable else "foreign", "status": status, "failure": failure}
                results.append(result)
                if status != expected or failure != expected_failure or json.loads(body) != {"state": "unavailable"}:
                    raise AssertionError(result)
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)

(out / "http-admission.json").write_text(json.dumps({"buildId": (root / ".next/BUILD_ID").read_text().strip(), "probes": results, "passed": len(results), "applicationCredentialsUsed": False}, indent=2) + "\n")
print(json.dumps({"passed": len(results), "failed": 0, "ownedServersStopped": True}))
