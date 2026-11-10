const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('              Launching LifePilot AI');
console.log('========================================================\n');

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

// Ensure Node is in PATH
const extendedPath = `C:\\Program Files\\nodejs;${process.env.PATH || ''}`;

// Start backend
console.log('[*] Starting Backend Server (Port 5000)...');
const backend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: serverDir,
  shell: true,
  stdio: 'pipe',
  env: { ...process.env, PATH: extendedPath }
});

backend.stdout.on('data', (d) => process.stdout.write(`[Backend]  ${d}`));
backend.stderr.on('data', (d) => process.stderr.write(`[Backend]  ${d}`));

// Start frontend
console.log('[*] Starting Frontend Client (Port 5173)...');
const frontend = spawn('npx.cmd', ['vite', '--host', 'localhost', '--port', '5173'], {
  cwd: clientDir,
  shell: true,
  stdio: 'pipe',
  env: { ...process.env, PATH: extendedPath }
});

frontend.stdout.on('data', (d) => process.stdout.write(`[Frontend] ${d}`));
frontend.stderr.on('data', (d) => process.stderr.write(`[Frontend] ${d}`));

let opened = false;
function checkAndOpen() {
  if (opened) return;
  const req = http.get('http://localhost:5173', (res) => {
    if (!opened) {
      opened = true;
      console.log('\n========================================================');
      console.log('  LifePilot AI is running!');
      console.log('  - Frontend : http://localhost:5173');
      console.log('  - Backend  : http://localhost:5000');
      console.log('========================================================\n');
      console.log('[*] Opening http://localhost:5173 in browser...');
      spawn('cmd.exe', ['/c', 'start', 'http://localhost:5173'], { detached: true, stdio: 'ignore' });
    }
  });

  req.on('error', () => {
    setTimeout(checkAndOpen, 1000);
  });
}

setTimeout(checkAndOpen, 1500);

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('exit', () => {
  backend.kill();
  frontend.kill();
});

