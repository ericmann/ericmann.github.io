const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT  = path.resolve(__dirname, '..', 'images', 'atmo');

const VARIANTS = ['starfield', 'vaporwave', 'mobius', 'tesseract', 'abyss', 'dunes'];

const RENDER_MS = 4000;
const VIEWPORT = { width: 1280, height: 720 };

function serve(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
      if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const PORT = 8787;
  const server = await serve(DIST, PORT);
  console.log(`Serving dist on :${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });

  for (const variant of VARIANTS) {
    console.log(`Capturing ${variant}...`);
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

    await page.evaluate((name) => {
      if (window.Atmosphere && window.Atmosphere.set) window.Atmosphere.set(name);
    }, variant);

    if (variant === 'abyss') {
      const paths = [
        { x1: 100, y1: 360, x2: 1180, y2: 360 },
        { x1: 640, y1: 100, x2: 640, y2: 620 },
        { x1: 200, y1: 200, x2: 1080, y2: 520 },
        { x1: 1080, y1: 200, x2: 200, y2: 520 },
      ];
      for (const p of paths) {
        await page.mouse.move(p.x1, p.y1, { steps: 5 });
        await page.mouse.move(p.x2, p.y2, { steps: 40 });
        await page.waitForTimeout(200);
      }
      for (let i = 0; i < 3; i++) {
        const cx = 400 + Math.random() * 480;
        const cy = 200 + Math.random() * 320;
        for (let a = 0; a < 12; a++) {
          const angle = (a / 12) * Math.PI * 2;
          await page.mouse.move(cx + Math.cos(angle) * 200, cy + Math.sin(angle) * 150, { steps: 8 });
        }
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(800);
    } else {
      await page.waitForTimeout(RENDER_MS);
    }

    const bgCanvas = await page.$('canvas#bg');
    if (!bgCanvas) {
      console.warn(`  No #bg canvas found for ${variant}, taking full page screenshot`);
      await page.screenshot({ path: path.join(OUT, `${variant}.png`) });
    } else {
      await bgCanvas.screenshot({ path: path.join(OUT, `${variant}.png`) });
    }

    console.log(`  Saved ${variant}.png`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('Done. Screenshots in', OUT);
})();
