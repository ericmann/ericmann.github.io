// ═══════════════════════════════════════
// AURORA — northern lights curtains
// Layered sine-wave curtains of light undulating across most of the
// viewport. Colors cycle slowly through green → cyan → violet.
// Mouse Y very subtly modulates the slowest sine frequency.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler;
  let W = 0, H = 0, dpr = 1;
  let mouseY = 0.5;
  let lastTime = 0;
  let isPreview = false;
  let time = 0;

  const CYCLE_DURATION = 45;
  const CURTAIN_ALPHA = 0.35;
  const CURTAIN_THICKNESS = 100;
  const X_STEP = 2;

  const curtains = [
    {
      baseYFrac: 0.15,
      hueOffset: 0,
      thickness: 160,
      layers: [
        { amp: 45, freq: 0.003,  speed: 0.15 },
        { amp: 25, freq: 0.007,  speed: -0.25 },
        { amp: 14, freq: 0.013,  speed: 0.4 },
        { amp: 7,  freq: 0.021,  speed: -0.6 },
      ],
    },
    {
      baseYFrac: 0.30,
      hueOffset: 40,
      thickness: 140,
      layers: [
        { amp: 50, freq: 0.004,  speed: -0.12 },
        { amp: 22, freq: 0.009,  speed: 0.3 },
        { amp: 12, freq: 0.016,  speed: -0.45 },
      ],
    },
    {
      baseYFrac: 0.48,
      hueOffset: 90,
      thickness: 130,
      layers: [
        { amp: 40, freq: 0.0035, speed: 0.18 },
        { amp: 28, freq: 0.008,  speed: -0.22 },
        { amp: 16, freq: 0.014,  speed: 0.35 },
        { amp: 8,  freq: 0.025,  speed: -0.5 },
      ],
    },
    {
      baseYFrac: 0.62,
      hueOffset: 140,
      thickness: 120,
      layers: [
        { amp: 35, freq: 0.0025, speed: -0.14 },
        { amp: 18, freq: 0.006,  speed: 0.28 },
        { amp: 11, freq: 0.018,  speed: -0.38 },
      ],
    },
  ];

  function computeCenterY(curtain, x, t, mouseMod) {
    let y = curtain.baseYFrac * H;
    for (let i = 0; i < curtain.layers.length; i++) {
      const l = curtain.layers[i];
      let freq = l.freq;
      if (i === curtain.layers.length - 1) {
        freq *= (0.95 + mouseMod * 0.1);
      }
      y += l.amp * Math.sin(x * freq + l.speed * t);
    }
    return y;
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
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    time += dt * (isPreview ? 1.3 : 1.0);

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    const hueBase = 120 + (time / CYCLE_DURATION) * 360;
    const mouseMod = mouseY;

    for (let ci = 0; ci < curtains.length; ci++) {
      const c = curtains[ci];
      const hue = (hueBase + c.hueOffset) % 360;
      const halfT = c.thickness * 0.5;

      for (let x = 0; x < W; x += X_STEP) {
        const centerY = computeCenterY(c, x, time, mouseMod);

        const brightnessMod = 0.7 + 0.3 * Math.sin(x * 0.005 + time * 0.3 + ci * 2.0);

        const grad = ctx.createLinearGradient(x, centerY - halfT, x, centerY + halfT);
        const peakAlpha = CURTAIN_ALPHA * brightnessMod;
        grad.addColorStop(0, 'hsla(' + hue + ', 80%, 60%, 0)');
        grad.addColorStop(0.3, 'hsla(' + hue + ', 80%, 65%, ' + (peakAlpha * 0.5) + ')');
        grad.addColorStop(0.5, 'hsla(' + hue + ', 85%, 70%, ' + peakAlpha + ')');
        grad.addColorStop(0.7, 'hsla(' + hue + ', 80%, 65%, ' + (peakAlpha * 0.5) + ')');
        grad.addColorStop(1, 'hsla(' + hue + ', 80%, 60%, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(x, centerY - halfT, X_STEP + 1, c.thickness);
      }
    }
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
    mouseY = 0.5;

    applySize();

    if (!isPreview) {
      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) {
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
    resizeHandler = mouseHandler = null;
    mouseY = 0.5;
    isPreview = false;
    time = 0;
  }

  window.Atmospheres.aurora = { init, destroy };
})();
