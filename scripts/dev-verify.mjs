import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const server = spawn(process.execPath, [next, 'dev', '-p', '3001', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, TUTOR_DEV_DIST_DIR: '.next-verify' },
});

server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
