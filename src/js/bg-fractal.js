// ═══════════════════════════════════════
// FRACTAL — super exotic
// Particles wander randomly, then slowly converge into a Sierpinski
// triangle via the chaos game. The structure emerges from noise over
// ~30 seconds like a signal locking in. Ice-blue on black, no color.
// Mouse proximity gently disturbs settled particles.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let W = 0, H = 0, dpr = 1;
  let isPreview = false;
  let lastTime = 0;
  let time = 0;
  let mouseX = -9999, mouseY = -9999;

  let particles = [];
  let vertices = [];
  let trailCanvas = null, trailCtx = null;

  const PARTICLE_COUNT_FULL = 800;
  const PARTICLE_COUNT_PREVIEW = 300;
  const SETTLE_START = 2;
  const SETTLE_DURATION = 25;
  const MOUSE_RADIUS = 120;
  const MOUSE_PUSH = 400;
  const FADE_ALPHA = 0.012;

  function computeVertices() {
    var pad = Math.min(W, H) * 0.08;
    var triH = H - pad * 2;
    var triW = triH * (2 / Math.sqrt(3));
    if (triW > W - pad * 2) {
      triW = W - pad * 2;
      triH = triW * Math.sqrt(3) / 2;
    }
    var cx = W / 2;
    var bottom = H - pad;
    vertices = [
      { x: cx,             y: bottom - triH },
      { x: cx - triW / 2,  y: bottom },
      { x: cx + triW / 2,  y: bottom },
    ];
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      tx: 0, ty: 0,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      settled: false,
      brightness: 0.3 + Math.random() * 0.4,
    };
  }

  function chaosStep(p) {
    var v = vertices[Math.floor(Math.random() * 3)];
    p.tx = (p.x + v.x) / 2;
    p.ty = (p.y + v.y) / 2;
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

    trailCanvas.width  = W * dpr;
    trailCanvas.height = H * dpr;
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trailCtx.fillStyle = '#050510';
    trailCtx.fillRect(0, 0, W, H);

    computeVertices();
    initParticles();
  }

  function initParticles() {
    var count = isPreview ? PARTICLE_COUNT_PREVIEW : PARTICLE_COUNT_FULL;
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push(createParticle());
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    time += dt;

    var settleT = Math.max(0, Math.min(1, (time - SETTLE_START) / SETTLE_DURATION));
    var convergence = settleT * settleT;

    trailCtx.fillStyle = 'rgba(5, 5, 16, ' + FADE_ALPHA + ')';
    trailCtx.fillRect(0, 0, W, H);

    var haveMouse = !isPreview && mouseX > -9000;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (convergence > 0.01) {
        chaosStep(p);

        var pullStrength = convergence * 4;
        p.vx += (p.tx - p.x) * pullStrength * dt;
        p.vy += (p.ty - p.y) * pullStrength * dt;
      }

      if (convergence < 0.95) {
        p.vx += (Math.random() - 0.5) * 30 * (1 - convergence) * dt;
        p.vy += (Math.random() - 0.5) * 30 * (1 - convergence) * dt;
      }

      if (haveMouse) {
        var dmx = p.x - mouseX;
        var dmy = p.y - mouseY;
        var dSq = dmx * dmx + dmy * dmy;
        if (dSq < MOUSE_RADIUS * MOUSE_RADIUS && dSq > 1) {
          var dist = Math.sqrt(dSq);
          var fall = 1 - dist / MOUSE_RADIUS;
          var push = fall * fall * MOUSE_PUSH;
          p.vx += (dmx / dist) * push * dt;
          p.vy += (dmy / dist) * push * dt;
        }
      }

      var damping = 0.92 - convergence * 0.07;
      p.vx *= damping;
      p.vy *= damping;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
      else if (p.x > W) { p.x = W; p.vx *= -0.5; }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
      else if (p.y > H) { p.y = H; p.vy *= -0.5; }

      var alpha = p.brightness * (0.15 + convergence * 0.55);
      var size = 1.5 - convergence * 0.7;
      trailCtx.fillStyle = 'rgba(180, 210, 240, ' + alpha.toFixed(3) + ')';
      trailCtx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(trailCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);
  }

  function init(opts) {
    opts = opts || {};
    isPreview = !!opts.preview;
    canvas = opts.canvas || document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W = opts.width  || window.innerWidth;
    H = opts.height || window.innerHeight;

    trailCanvas = document.createElement('canvas');
    trailCtx = trailCanvas.getContext('2d');

    time = 0;
    mouseX = mouseY = -9999;

    applySize();

    if (!isPreview) {
      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) { mouseX = e.clientX; mouseY = e.clientY; };
      document.addEventListener('mousemove', mouseHandler);

      mouseLeaveHandler = function() { mouseX = -9999; mouseY = -9999; };
      document.addEventListener('mouseleave', mouseLeaveHandler);
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
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
    particles = [];
    vertices = [];
    canvas = ctx = null;
    trailCanvas = trailCtx = null;
    resizeHandler = mouseHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
    isPreview = false;
    time = 0;
  }

  window.Atmospheres.fractal = { init, destroy };
})();
