#!/usr/bin/env node
/**
 * Run a command with variables loaded from an env file, without putting any
 * value on the command line or in shell history:
 *
 *   node scripts/with-env-file.mjs <env file> <command> [args...]
 *
 * Used for `next build`, `next start` and the payroll worker, whose child
 * processes reject `--env-file` inside NODE_OPTIONS. Values in the file win
 * over the current environment. Nothing from the file is printed.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const [file, command, ...args] = process.argv.slice(2);
if (!file || !command) {
  console.error('Usage: node scripts/with-env-file.mjs <env file> <command> [args...]');
  process.exit(2);
}
const values = parseEnv(readFileSync(file, 'utf8'));
const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...values } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
