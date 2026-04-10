// ═══════════════════════════════════════
// FRACTAL — super exotic
// Particles wander randomly, then converge into a Sierpinski triangle
// via the chaos game. Each particle jumps to the midpoint between
// itself and a random vertex, leaving fading traces that reveal the
// fractal structure. Ice-blue on black. Mouse scatters particles.
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

  const COUNT_FULL = 600;
  const COUNT_PREVIEW = 250;
  const WANDER_PHASE = 4;
  const CONVERGE_RAMP = 12;
  const MOUSE_RADIUS = 200;
  const MOUSE_PUSH = 2400;
  const TRAIL_FADE = 0.04;

  function computeVertices() {
    var pad = Math.min(W, H) * 0.1;
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
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      driftAngle: Math.random() * Math.PI * 2,
      driftRate: 0.4 + Math.random() * 0.8,
      speed: 15 + Math.random() * 25,
      scattered: 0,
    };
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

    computeVertices();
    initParticles();
  }

  function initParticles() {
    var count = isPreview ? COUNT_PREVIEW : COUNT_FULL;
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

    var convergeT = Math.max(0, Math.min(1, (time - WANDER_PHASE) / CONVERGE_RAMP));
    var convergence = convergeT * convergeT;

    ctx.fillStyle = 'rgba(5, 5, 16, ' + TRAIL_FADE.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    var haveMouse = !isPreview && mouseX > -9000;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (p.scattered > 0) {
        p.scattered -= dt;
      }

      var doJump = convergence > 0.01 && p.scattered <= 0;

      if (doJump) {
        var v = vertices[Math.floor(Math.random() * 3)];
        var blend = convergence;
        p.x = p.x + (((p.x + v.x) * 0.5) - p.x) * blend;
        p.y = p.y + (((p.y + v.y) * 0.5) - p.y) * blend;
        p.vx *= (1 - convergence * 0.8);
        p.vy *= (1 - convergence * 0.8);
      }

      if (convergence < 0.9 || p.scattered > 0) {
        var wanderStrength = p.scattered > 0 ? 1 : (1 - convergence);
        p.driftAngle += (Math.random() - 0.5) * p.driftRate * dt * 5;
        var tx = Math.cos(p.driftAngle) * p.speed;
        var ty = Math.sin(p.driftAngle) * p.speed;
        p.vx += (tx - p.vx) * wanderStrength * dt * 3;
        p.vy += (ty - p.vy) * wanderStrength * dt * 3;
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
          p.scattered = 1.5;
        }
      }

      p.vx *= 0.94;
      p.vy *= 0.94;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
      else if (p.x > W) { p.x = W; p.vx *= -0.5; }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
      else if (p.y > H) { p.y = H; p.vy *= -0.5; }

      var alpha = 0.15 + convergence * 0.5;
      if (p.scattered > 0) alpha *= 0.6;
      var size = 1.6 - convergence * 0.6;

      ctx.fillStyle = 'rgba(180, 215, 240, ' + alpha.toFixed(3) + ')';
      ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
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
    resizeHandler = mouseHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
    isPreview = false;
    time = 0;
  }

  window.Atmospheres.fractal = { init, destroy };
})();
