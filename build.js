const fs = require('fs');
const path = require('path');

const DIST = 'dist';
const layout = fs.readFileSync('src/layouts/base.html', 'utf8');

const pages = [
  { src: 'src/pages/index.html', out: path.join(DIST, 'index.html') },
  { src: 'src/pages/talks.html', out: path.join(DIST, 'talks', 'index.html') },
  { src: 'src/work/ipo-security.html', out: path.join(DIST, 'work', 'ipo-security.html') },
  { src: 'src/work/il5-auth.html', out: path.join(DIST, 'work', 'il5-auth.html') },
  { src: 'src/work/e2ee-platform.html', out: path.join(DIST, 'work', 'e2ee-platform.html') },
  { src: 'src/work/php-release.html', out: path.join(DIST, 'work', 'php-release.html') },
  { src: 'src/work/10up.html', out: path.join(DIST, 'work', '10up.html') },
  { src: 'src/work/canton.html', out: path.join(DIST, 'work', 'canton.html') },
];

const staticDirs = [
  { src: 'src/css',   out: path.join(DIST, 'css') },
  { src: 'src/js',    out: path.join(DIST, 'js') },
  { src: 'src/fonts', out: path.join(DIST, 'fonts') },
];

const passthrough = [
  { src: 'images',       out: path.join(DIST, 'images') },
  { src: '.well-known',  out: path.join(DIST, '.well-known') },
];

const passthroughFiles = [
  { src: 'CNAME',      out: path.join(DIST, 'CNAME') },
  { src: 'humans.txt', out: path.join(DIST, 'humans.txt') },
  { src: 'robots.txt', out: path.join(DIST, 'robots.txt') },
  { src: 'llms.txt',   out: path.join(DIST, 'llms.txt') },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function clean(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

clean(DIST);

for (const page of pages) {
  const raw = fs.readFileSync(page.src, 'utf8');
  const title = raw.match(/<!-- title: (.+?) -->/)?.[1] || 'Eric A Mann';
  const desc  = raw.match(/<!-- description: (.+?) -->/)?.[1] || '';
  const content = raw
    .replace(/<!--\s*title:.*?-->\n?/, '')
    .replace(/<!--\s*description:.*?-->\n?/, '');

  const html = layout
    .replace('{{title}}', title)
    .replace('{{description}}', desc)
    .replace('{{content}}', content);

  fs.mkdirSync(path.dirname(page.out), { recursive: true });
  fs.writeFileSync(page.out, html);
  console.log(`  built ${page.out}`);
}

for (const dir of staticDirs) {
  copyDir(dir.src, dir.out);
  console.log(`  copied ${dir.src} -> ${dir.out}`);
}

for (const dir of passthrough) {
  if (fs.existsSync(dir.src)) {
    copyDir(dir.src, dir.out);
    console.log(`  copied ${dir.src} -> ${dir.out}`);
  }
}

for (const file of passthroughFiles) {
  if (fs.existsSync(file.src)) {
    fs.mkdirSync(path.dirname(file.out), { recursive: true });
    fs.copyFileSync(file.src, file.out);
    console.log(`  copied ${file.src} -> ${file.out}`);
  }
}

console.log('\ndone.');
