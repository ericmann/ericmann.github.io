// ═══════════════════════════════════════
// FRACTAL — super exotic
// Infinite zoom into the Mandelbrot set. The camera drifts toward a
// deeply nested spiral at the edge of the main cardioid, revealing
// ever-finer self-similar structure. Palette shifts slowly over time.
// Mouse position subtly biases the zoom target.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler;
  let W = 0, H = 0, dpr = 1;
  let isPreview = false;
  let lastTime = 0;
  let time = 0;
  let mouseX = 0.5, mouseY = 0.5;

  let imgData = null;
  let buf = null;
  let buf8 = null;

  const TARGET_RE = -0.743643887037151;
  const TARGET_IM =  0.131825904205330;

  const ZOOM_SPEED = 0.15;
  const MAX_ITER_BASE = 120;
  const PALETTE_CYCLE = 60;

  let renderW = 0, renderH = 0;

  function hslToRgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function hue2rgb(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    return [
      (hue2rgb(h + 1/3) * 255) | 0,
      (hue2rgb(h) * 255) | 0,
      (hue2rgb(h - 1/3) * 255) | 0,
    ];
  }

  function renderFractal() {
    var zoom = Math.pow(2, time * ZOOM_SPEED);

    var mouseBias = isPreview ? 0 : 0.0003 / zoom;
    var cx = TARGET_RE + (mouseX - 0.5) * mouseBias;
    var cy = TARGET_IM + (mouseY - 0.5) * mouseBias;

    var aspect = renderW / renderH;
    var scaleY = 2.0 / zoom;
    var scaleX = scaleY * aspect;

    var maxIter = MAX_ITER_BASE + Math.floor(time * 2.5);
    if (maxIter > 600) maxIter = 600;

    var hueShift = time / PALETTE_CYCLE;
    var idx = 0;

    for (var py = 0; py < renderH; py++) {
      var im = cy + (py / renderH - 0.5) * scaleY;
      for (var px = 0; px < renderW; px++) {
        var re = cx + (px / renderW - 0.5) * scaleX;

        var zr = 0, zi = 0;
        var zr2 = 0, zi2 = 0;
        var iter = 0;

        while (zr2 + zi2 <= 4 && iter < maxIter) {
          zi = 2 * zr * zi + im;
          zr = zr2 - zi2 + re;
          zr2 = zr * zr;
          zi2 = zi * zi;
          iter++;
        }

        var r, g, b;
        if (iter === maxIter) {
          r = g = b = 0;
        } else {
          var log2 = Math.log(2);
          var nu = Math.log(Math.log(zr2 + zi2) / log2) / log2;
          var smooth = iter + 1 - nu;
          var hue = hueShift + smooth * 0.015;
          var sat = 0.75;
          var lgt = 0.08 + 0.42 * (1 - Math.pow(1 - (smooth / maxIter), 3));
          var rgb = hslToRgb(hue, sat, lgt);
          r = rgb[0]; g = rgb[1]; b = rgb[2];
        }

        buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
        idx++;
      }
    }

    imgData.data.set(buf8);
  }

  function applySize() {
    dpr = isPreview ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    if (!isPreview) {
      W = window.innerWidth;
      H = window.innerHeight;
    }
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var downscale = isPreview ? 4 : 3;
    renderW = Math.ceil(W / downscale);
    renderH = Math.ceil(H / downscale);

    imgData = ctx.createImageData(renderW, renderH);
    var arrayBuf = new ArrayBuffer(imgData.data.length);
    buf8 = new Uint8ClampedArray(arrayBuf);
    buf = new Uint32Array(arrayBuf);
  }

  let frameSkip = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    time += dt;

    frameSkip++;
    if (frameSkip % 2 !== 0) return;

    renderFractal();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.imageSmoothingEnabled = true;
    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0, renderW, renderH, 0, 0, W, H);
  }

  function init(opts) {
    opts = opts || {};
    isPreview = !!opts.preview;
    canvas = opts.canvas || document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W = opts.width  || window.innerWidth;
    H = opts.height || window.innerHeight;

    time = 0;
    mouseX = 0.5;
    mouseY = 0.5;
    frameSkip = 0;

    applySize();

    if (!isPreview) {
      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) {
        mouseX = e.clientX / W;
        mouseY = e.clientY / H;
      };
      document.addEventListener('mousemove', mouseHandler);
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas = ctx = null;
    imgData = buf = buf8 = null;
    resizeHandler = mouseHandler = null;
    mouseX = mouseY = 0.5;
    isPreview = false;
    time = 0;
  }

  window.Atmospheres.fractal = { init, destroy };
})();
