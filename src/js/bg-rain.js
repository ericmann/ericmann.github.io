// ═══════════════════════════════════════
// RAIN — ambient
// Top-down view of a dark water surface. Raindrops land at random
// positions creating expanding concentric ripple rings. The cursor
// produces a sustained disturbance — small ripples near the pointer.
// Monochrome blue-white palette on near-black (#050510).
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let ripples = [];
  let W = 0, H = 0, dpr = 1;
  let mouseX = -9999, mouseY = -9999;
  let lastTime = 0;
  let isPreview = false;
  let spawnAccum = 0;
  let mouseSpawnAccum = 0;

  const SPAWN_RATE = 1.5;
  const SPAWN_RATE_PREVIEW = 2.5;
  const LIFETIME_MIN = 3.0;
  const LIFETIME_MAX = 4.0;
  const MAX_RADIUS_MIN = 150;
  const MAX_RADIUS_MAX = 250;
  const MAX_RIPPLES = 60;
  const MAX_RIPPLES_PREVIEW = 25;
  const MOUSE_SPAWN_INTERVAL = 0.12;
  const MOUSE_RADIUS_MIN = 30;
  const MOUSE_RADIUS_MAX = 70;
  const MOUSE_LIFETIME = 1.8;
  const MOUSE_JITTER = 40;
  const RING_COUNT = 3;

  function spawnRipple(x, y, maxR, lifetime) {
    ripples.push({
      x: x,
      y: y,
      age: 0,
      lifetime: lifetime,
      maxRadius: maxR,
    });
  }

  function spawnRandom() {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const maxR = MAX_RADIUS_MIN + Math.random() * (MAX_RADIUS_MAX - MAX_RADIUS_MIN);
    const life = LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN);
    spawnRipple(x, y, maxR, life);
  }

  function init(opts) {
    opts = opts || {};
    isPreview = !!opts.preview;
    canvas = opts.canvas || document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W = opts.width  || window.innerWidth;
    H = opts.height || window.innerHeight;

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
    applySize();

    if (!isPreview) {
      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) { mouseX = e.clientX; mouseY = e.clientY; };
      document.addEventListener('mousemove', mouseHandler);

      mouseLeaveHandler = function() { mouseX = -9999; mouseY = -9999; };
      document.addEventListener('mouseleave', mouseLeaveHandler);
    }

    ripples = [];
    spawnAccum = 0;
    mouseSpawnAccum = 0;

    for (var i = 0; i < 4; i++) {
      spawnRandom();
      ripples[i].age = Math.random() * ripples[i].lifetime * 0.6;
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    var cap = isPreview ? MAX_RIPPLES_PREVIEW : MAX_RIPPLES;
    var rate = isPreview ? SPAWN_RATE_PREVIEW : SPAWN_RATE;

    spawnAccum += dt * rate;
    while (spawnAccum >= 1 && ripples.length < cap) {
      spawnAccum -= 1;
      spawnRandom();
    }
    if (spawnAccum >= 1) spawnAccum = 0;

    if (!isPreview && mouseX > -9000) {
      mouseSpawnAccum += dt;
      while (mouseSpawnAccum >= MOUSE_SPAWN_INTERVAL && ripples.length < cap) {
        mouseSpawnAccum -= MOUSE_SPAWN_INTERVAL;
        var mx = mouseX + (Math.random() - 0.5) * MOUSE_JITTER * 2;
        var my = mouseY + (Math.random() - 0.5) * MOUSE_JITTER * 2;
        var mr = MOUSE_RADIUS_MIN + Math.random() * (MOUSE_RADIUS_MAX - MOUSE_RADIUS_MIN);
        spawnRipple(mx, my, mr, MOUSE_LIFETIME);
      }
    }

    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age >= ripples[i].lifetime) {
        ripples.splice(i, 1);
      }
    }

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var progress = r.age / r.lifetime;
      var baseAlpha = 1 - progress;
      baseAlpha *= baseAlpha;

      for (var ring = 0; ring < RING_COUNT; ring++) {
        var ringOffset = ring * 0.12;
        var ringProgress = Math.max(0, progress - ringOffset);
        if (ringProgress <= 0 || ringProgress >= 1) continue;

        var radius = ringProgress * r.maxRadius;
        var ringAlpha = (1 - ringProgress) * (1 - ringOffset * 2);
        ringAlpha *= ringAlpha;
        ringAlpha *= 0.45;
        if (ringAlpha <= 0.005) continue;

        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200,220,240,' + ringAlpha.toFixed(3) + ')';
        ctx.stroke();
      }

      if (baseAlpha > 0.1 && progress < 0.15) {
        var dotAlpha = (1 - progress / 0.15) * 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,235,255,' + dotAlpha.toFixed(3) + ')';
        ctx.fill();
      }
    }
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    if (mouseLeaveHandler) document.removeEventListener('mouseleave', mouseLeaveHandler);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ripples = [];
    canvas = ctx = null;
    mouseHandler = resizeHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
    isPreview = false;
    spawnAccum = 0;
    mouseSpawnAccum = 0;
  }

  window.Atmospheres.rain = { init, destroy };
})();
