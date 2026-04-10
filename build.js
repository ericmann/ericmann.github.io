const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { marked } = require('marked');

const DIST = 'dist';

const pages = [
  { src: 'src/pages/index.html', out: path.join(DIST, 'index.html') },
  { src: 'src/pages/talks.html', out: path.join(DIST, 'talks', 'index.html') },
  { src: 'src/pages/atmosphere.html', out: path.join(DIST, 'atmosphere', 'index.html') },
  { src: 'src/pages/blank.html', out: path.join(DIST, 'blank', 'index.html') },
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

// ── Build ──

clean(DIST);

// 1. Copy static assets first (css, js, fonts)
for (const dir of staticDirs) {
  copyDir(dir.src, dir.out);
  console.log(`  copied ${dir.src} -> ${dir.out}`);
}

// 2. Hash-rename CSS/JS files in dist and build a rewrite map
//    e.g. /css/core.css → /css/core.a1b2c3d4.css
const assetMap = {};

function hashRenameDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hashRenameDir(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    if (ext !== '.css' && ext !== '.js') continue;

    const content = fs.readFileSync(fullPath);
    const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
    const base = path.basename(entry.name, ext);
    const hashedName = `${base}.${hash}${ext}`;
    const hashedPath = path.join(dir, hashedName);

    fs.renameSync(fullPath, hashedPath);

    const origUrl = '/' + path.relative(DIST, fullPath);
    const hashedUrl = '/' + path.relative(DIST, hashedPath);
    assetMap[origUrl] = hashedUrl;
  }
}

hashRenameDir(path.join(DIST, 'css'));
hashRenameDir(path.join(DIST, 'js'));

console.log(`  hashed ${Object.keys(assetMap).length} assets`);

// 3. Read layout and rewrite asset references
let layout = fs.readFileSync('src/layouts/base.html', 'utf8');
for (const [orig, hashed] of Object.entries(assetMap)) {
  layout = layout.split(orig).join(hashed);
}

// 4. Build pages
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

// 5. Copy passthrough directories and files
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

// ── /now page: Markdown → HTML ──
const nowMd = fs.readFileSync('src/now/content.md', 'utf8');
const fmMatch = nowMd.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const frontmatter = fmMatch ? fmMatch[1] : '';
const mdBody = fmMatch ? fmMatch[2] : nowMd;
const updated = (frontmatter.match(/updated:\s*(.+)/) || [])[1] || 'unknown';
const renderedMd = marked.parse(mdBody);

const nowTemplate = fs.readFileSync('src/now/template.html', 'utf8');
const nowContent = nowTemplate
  .replace('{{UPDATED}}', updated)
  .replace('{{CONTENT}}', renderedMd);

const nowTitle = nowContent.match(/<!-- title: (.+?) -->/)?.[1] || 'Now — Eric A Mann';
const nowDesc  = nowContent.match(/<!-- description: (.+?) -->/)?.[1] || '';
const nowBody  = nowContent
  .replace(/<!--\s*title:.*?-->\n?/, '')
  .replace(/<!--\s*description:.*?-->\n?/, '');
const nowHtml = layout
  .replace('{{title}}', nowTitle)
  .replace('{{description}}', nowDesc)
  .replace('{{content}}', nowBody);

const nowOut = path.join(DIST, 'now', 'index.html');
fs.mkdirSync(path.dirname(nowOut), { recursive: true });
fs.writeFileSync(nowOut, nowHtml);
console.log(`  built ${nowOut}`);

console.log('\ndone.');
