const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT  = path.resolve(__dirname, '..', 'images', 'atmo');

const VARIANTS = ['starfield', 'vaporwave', 'mobius', 'tesseract', 'abyss', 'dunes'];

const RENDER_MS = 4000;
const VIEWPORT = { width: 800, height: 600 };

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
      await page.waitForTimeout(1500);
      const sweeps = [
        { x1: 100, y1: 500, x2: 1180, y2: 220 },
        { x1: 1180, y1: 500, x2: 100, y2: 220 },
        { x1: 200, y1: 360, x2: 1080, y2: 360 },
        { x1: 640, y1: 100, x2: 640, y2: 620 },
        { x1: 100, y1: 200, x2: 1100, y2: 520 },
        { x1: 1100, y1: 200, x2: 100, y2: 520 },
      ];
      for (const s of sweeps) {
        await page.mouse.move(s.x1, s.y1, { steps: 3 });
        await page.mouse.move(s.x2, s.y2, { steps: 50 });
      }
      for (let i = 0; i < 4; i++) {
        const cx = 300 + Math.random() * 680;
        const cy = 150 + Math.random() * 420;
        for (let a = 0; a < 16; a++) {
          const angle = (a / 16) * Math.PI * 2;
          await page.mouse.move(cx + Math.cos(angle) * 250, cy + Math.sin(angle) * 180, { steps: 6 });
        }
      }
      await page.waitForTimeout(150);
    } else {
      await page.waitForTimeout(RENDER_MS);
    }

    await page.evaluate(() => {
      document.querySelectorAll('body > *:not(canvas#bg)').forEach(
        el => { el.style.display = 'none'; }
      );
    });
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(OUT, `${variant}.png`) });

    console.log(`  Saved ${variant}.png`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('Done. Screenshots in', OUT);
})();
