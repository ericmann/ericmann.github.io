const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function build() {
  try {
    execSync('node build.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('build failed');
  }
}

function watchRecursive(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      watchRecursive(path.join(dir, entry.name), callback);
    }
  }
  fs.watch(dir, { persistent: true }, callback);
}

build();

const server = spawn('python3', ['-m', 'http.server', '8000'], {
  cwd: path.join(__dirname, 'dist'),
  stdio: 'inherit',
});

let debounce = null;
watchRecursive('src', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log('\nrebuilding...');
    build();
  }, 200);
});

console.log('\nwatching src/ for changes... (Ctrl+C to stop)\n');

process.on('SIGINT', () => {
  server.kill();
  process.exit();
});
