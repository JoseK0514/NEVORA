import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {neon} from '@neondatabase/serverless';
import {readPhotoPlatformBinding} from '../src/lib/clocker/photo-server/platform-lifecycle';
import {readFaceKey} from '../src/lib/clocker/face-verification/crypto.server';
import {runClockerFaceWorker, type FaceMatcher} from '../src/lib/clocker/face-verification/worker.server';
import type {SqlStatement} from '../src/lib/notifications/types';

type Artifact = {path: string; sha256: string};
type MatcherConfig = {detector: Artifact; recognizer: Artifact; mismatchThreshold: number; matchThreshold: number};
const adapter = fileURLToPath(new URL('./clocker-face-matcher.py', import.meta.url));

async function verifyArtifact(artifact: Artifact) {
  if (!artifact || !isAbsolute(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw Error('candidate_artifact_invalid');
  const info = await lstat(artifact.path);
  if (!info.isFile() || (info.mode & 0o222) || info.size > 100_000_000) throw Error('candidate_artifact_invalid');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(artifact.path)) digest.update(chunk);
  if (digest.digest('hex') !== artifact.sha256) throw Error('candidate_artifact_invalid');
}

async function matcherConfig(file: string): Promise<MatcherConfig> {
  if (!isAbsolute(file)) throw Error('candidate_manifest_invalid');
  const info = await lstat(file);
  if (!info.isFile() || (info.mode & 0o222) || info.size > 4096) throw Error('candidate_manifest_invalid');
  const config: MatcherConfig = JSON.parse(await readFile(file, 'utf8'));
  if (!Number.isFinite(config.mismatchThreshold) || !Number.isFinite(config.matchThreshold) ||
    config.mismatchThreshold < -1 || config.matchThreshold > 1 || config.mismatchThreshold >= config.matchThreshold) throw Error('candidate_thresholds_invalid');
  await Promise.all([verifyArtifact(config.detector), verifyArtifact(config.recognizer)]);
  return config;
}

function invoke(python: string, config: MatcherConfig, input: string, check = false): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [adapter, config.detector.path, config.recognizer.path,
      String(config.mismatchThreshold), String(config.matchThreshold)];
    if (check) args.push('--check');
    const child = spawn(python, args, {stdio: ['pipe', 'pipe', 'ignore'], env: {
      NODE_ENV: 'production', PYTHONDONTWRITEBYTECODE: '1', OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1',
    }, signal: AbortSignal.timeout(15_000)});
    const chunks: Buffer[] = [];
    let size = 0;
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= 4096) chunks.push(chunk);
      else child.kill('SIGKILL');
    });
    child.stdin.on('error', reject);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 || size > 4096) return reject(Error('matcher_unavailable'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Error('matcher_unavailable')); }
    });
    child.stdin.end(input);
  });
}

async function main() {
  const python = process.env.NEVORA_CLOCKER_FACE_PYTHON ?? '';
  const scope = readPhotoPlatformBinding(process.env), key = readFaceKey();
  const checkOnly = process.argv.length === 3 && process.argv[2] === '--check';
  if (!isAbsolute(python) || (!checkOnly && (!scope || !key || process.argv.length !== 2))) throw Error('face_worker_unavailable');
  const config = await matcherConfig(process.env.NEVORA_CLOCKER_FACE_MODEL_MANIFEST ?? '');
  const ready = await invoke(python, config, '', true) as {ready?: boolean; runtime?: string[]};
  if (ready?.ready !== true || ready.runtime?.length !== 3 ||
    !ready.runtime.every(version => /^\d+\.\d+\.\d+$/.test(version))) throw Error('face_matcher_unavailable');
  const modelVersion = 'yunet-sface-v1:' + createHash('sha256').update(JSON.stringify([
    config.detector.sha256, config.recognizer.sha256, config.mismatchThreshold, config.matchThreshold,
    createHash('sha256').update(await readFile(adapter)).digest('hex'), ready.runtime,
  ])).digest('hex');
  if (checkOnly) {
    console.log(JSON.stringify({ready: true, modelVersion}));
    return;
  }
  const target = new URL(process.env.NEVORA_CLOCKER_FACE_WORKER_DATABASE_URL ?? '');
  if (!scope || !key || !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !/^ep-[a-z0-9.-]+\.neon\.tech$/.test(target.hostname) || !target.password || target.hash ||
    !/^nv_face_stg_[a-z0-9_]{1,40}$/.test(decodeURIComponent(target.username)) ||
    [...target.searchParams].length !== 1 || target.searchParams.get('sslmode') !== 'verify-full') throw Error('face_worker_scope_invalid');
  const db = neon(target.href);
  const executor = {query: <T>(statement: SqlStatement) =>
    db.query(statement.text, [...statement.values], {fetchOptions: {signal: AbortSignal.timeout(5000)}}) as Promise<T[]>};
  const matcher: FaceMatcher = {
    modelVersion,
    async compare(input) {
      const result = await invoke(python, config, JSON.stringify({
        punch: input.punch.toString('base64'), reference: input.reference?.toString('base64'), template: input.template?.toString('base64'),
      })) as {outcome?: string; template?: string | null};
      if (!result || !['match', 'mismatch', 'inconclusive'].some(value => value === result.outcome)) throw Error('matcher_unavailable');
      return {outcome: result.outcome as 'match' | 'mismatch' | 'inconclusive',
        template: typeof result.template === 'string' ? Buffer.from(result.template, 'base64') : undefined};
    },
  };
  const results = await runClockerFaceWorker(executor, scope, key, matcher);
  console.log(JSON.stringify({modelVersion, ...results}));
}

void main().catch(() => {
  console.error('Clocker face verification worker unavailable.');
  process.exitCode = 1;
});
