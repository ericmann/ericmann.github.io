const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT  = path.resolve(__dirname, '..', 'images', 'atmo');

const registrySrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'js', 'atmosphere-registry.js'), 'utf8'
);
const VARIANTS = [];
registrySrc.replace(/id:\s*'([^']+)'/g, (_, id) => VARIANTS.push(id));

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

    const MOUSE_VARIANTS = ['abyss', 'forge', 'fireflies', 'dunes'];
    if (MOUSE_VARIANTS.includes(variant)) {
      await page.waitForTimeout(1500);
      const sweeps = [
        { x1: 100, y1: 500, x2: 700, y2: 220 },
        { x1: 700, y1: 500, x2: 100, y2: 220 },
        { x1: 200, y1: 360, x2: 600, y2: 360 },
        { x1: 400, y1: 100, x2: 400, y2: 520 },
        { x1: 100, y1: 200, x2: 700, y2: 420 },
        { x1: 700, y1: 200, x2: 100, y2: 420 },
      ];
      for (const s of sweeps) {
        await page.mouse.move(s.x1, s.y1, { steps: 3 });
        await page.mouse.move(s.x2, s.y2, { steps: 40 });
      }
      for (let i = 0; i < 3; i++) {
        const cx = 200 + Math.random() * 400;
        const cy = 150 + Math.random() * 300;
        for (let a = 0; a < 12; a++) {
          const angle = (a / 12) * Math.PI * 2;
          await page.mouse.move(cx + Math.cos(angle) * 200, cy + Math.sin(angle) * 150, { steps: 6 });
        }
      }
      await page.waitForTimeout(300);
    } else if (variant === 'sonar') {
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        document.dispatchEvent(
          new MouseEvent('click', { clientX: 400, clientY: 300, bubbles: true })
        );
      });
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        document.dispatchEvent(
          new MouseEvent('click', { clientX: 200, clientY: 150, bubbles: true })
        );
      });
      await page.waitForTimeout(2000);
    } else if (variant === 'constellation') {
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
    } else if (variant === 'roots') {
      await page.waitForTimeout(8000);
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
