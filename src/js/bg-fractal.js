// ═══════════════════════════════════════
// FRACTAL — super exotic
// Each particle has a home position on the Sierpinski triangle,
// pre-computed via the chaos game at init. Particles start scattered
// and drift randomly, then gradually converge toward their homes
// over ~40 seconds, revealing the fractal structure. Mouse scatters
// nearby particles; they drift back. Ice-blue on black.
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

  const COUNT_FULL = 3000;
  const COUNT_PREVIEW = 1200;
  const WANDER_PHASE = 5;
  const CONVERGE_RAMP = 35;
  const MOUSE_RADIUS = 200;
  const MOUSE_PUSH = 3000;
  const PULL_MAX = 5.0;
  const DAMPING = 0.9;
  const CHAOS_ITERATIONS = 30;

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

  function computeHome() {
    var hx = Math.random() * W;
    var hy = Math.random() * H;
    for (var i = 0; i < CHAOS_ITERATIONS; i++) {
      var v = vertices[Math.floor(Math.random() * 3)];
      hx = (hx + v.x) * 0.5;
      hy = (hy + v.y) * 0.5;
    }
    return { x: hx, y: hy };
  }

  function createParticle() {
    var home = computeHome();
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      homeX: home.x,
      homeY: home.y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      driftAngle: Math.random() * Math.PI * 2,
      driftRate: 0.3 + Math.random() * 0.7,
      speed: 12 + Math.random() * 25,
      scattered: 0,
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerFreq: 0.5 + Math.random() * 1.0,
      shimmerAmp: 1.5 + Math.random() * 2.5,
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

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    var haveMouse = !isPreview && mouseX > -9000;
    var pull = convergence * PULL_MAX;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (p.scattered > 0) {
        p.scattered -= dt;
      }

      if (pull > 0.01 && p.scattered <= 0) {
        var t = time * p.shimmerFreq + p.shimmerPhase;
        var sx = p.homeX + Math.sin(t) * p.shimmerAmp;
        var sy = p.homeY + Math.cos(t * 0.8 + 1.3) * p.shimmerAmp * 0.7;
        p.vx += (sx - p.x) * pull * dt;
        p.vy += (sy - p.y) * pull * dt;
      }

      var wanderAmt = p.scattered > 0 ? 0.7 : Math.max(0, 1 - convergence * 1.5);
      if (wanderAmt > 0.01) {
        p.driftAngle += (Math.random() - 0.5) * p.driftRate * dt * 4;
        p.vx += (Math.cos(p.driftAngle) * p.speed - p.vx) * wanderAmt * dt * 2;
        p.vy += (Math.sin(p.driftAngle) * p.speed - p.vy) * wanderAmt * dt * 2;
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
          p.scattered = 2.5;
        }
      }

      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
      else if (p.x > W) { p.x = W; p.vx *= -0.5; }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
      else if (p.y > H) { p.y = H; p.vy *= -0.5; }

      var distHome = Math.abs(p.x - p.homeX) + Math.abs(p.y - p.homeY);
      var nearHome = distHome < 10;
      var alpha = nearHome ? (0.35 + convergence * 0.35) : (0.2 + convergence * 0.15);
      var size = nearHome ? 1.4 : 1.8;

      ctx.fillStyle = 'rgba(180, 215, 240, ' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
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
