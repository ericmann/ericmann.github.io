// ═══════════════════════════════════════
// KINETIC — exotic
// A field of particles drifting like a large kinetic sculpture. Periodic
// wind ripples spawn from random edges, traveling across the viewport as
// a wavefront that displaces particles and shifts their color from
// ice-blue to magenta. Particles spring back to their homes once the
// ripple passes. Mouse repels nearby particles; they drift back.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let particles = [];
  let ripples = [];
  let W = 0, H = 0, dpr = 1;
  let mouseX = -9999, mouseY = -9999;
  let lastTime = 0;
  let isPreview = false;
  let nextRippleIn = 0;

  const COUNT_FULL = 1500;
  const COUNT_PREVIEW = 500;
  const SPRING = 6.0;
  const DAMPING = 0.88;
  const MOUSE_RADIUS = 180;
  const MOUSE_PUSH = 2500;
  const RIPPLE_SPEED_MIN = 300;
  const RIPPLE_SPEED_MAX = 400;
  const RIPPLE_DISPLACE = 20;
  const RIPPLE_FADE_WIDTH = 80;
  const RIPPLE_INTERVAL_MIN = 4;
  const RIPPLE_INTERVAL_MAX = 8;
  const RIPPLE_INTERVAL_PREVIEW_MIN = 2.5;
  const RIPPLE_INTERVAL_PREVIEW_MAX = 5;

  const COLOR_BASE = [180, 215, 240];
  const COLOR_RIPPLE = [255, 0, 170];

  function scheduleNextRipple() {
    var lo = isPreview ? RIPPLE_INTERVAL_PREVIEW_MIN : RIPPLE_INTERVAL_MIN;
    var hi = isPreview ? RIPPLE_INTERVAL_PREVIEW_MAX : RIPPLE_INTERVAL_MAX;
    nextRippleIn = lo + Math.random() * (hi - lo);
  }

  function spawnRipple() {
    var edge = Math.floor(Math.random() * 4);
    var dx = 0, dy = 0, startPos = 0;
    // Ripple travels along one axis; startPos is the wavefront's
    // initial coordinate on that axis, moving in the sign of dx/dy.
    if (edge === 0) { dy = 1; startPos = -RIPPLE_FADE_WIDTH; }         // top → down
    else if (edge === 1) { dy = -1; startPos = H + RIPPLE_FADE_WIDTH; } // bottom → up
    else if (edge === 2) { dx = 1; startPos = -RIPPLE_FADE_WIDTH; }     // left → right
    else { dx = -1; startPos = W + RIPPLE_FADE_WIDTH; }                  // right → left

    var span = (dx !== 0 ? W : H) + RIPPLE_FADE_WIDTH * 2;

    ripples.push({
      dx: dx, dy: dy,
      pos: startPos,
      speed: RIPPLE_SPEED_MIN + Math.random() * (RIPPLE_SPEED_MAX - RIPPLE_SPEED_MIN),
      distTraveled: 0,
      maxDist: span,
    });
  }

  function buildParticles() {
    particles = [];
    var count = isPreview ? COUNT_PREVIEW : COUNT_FULL;
    for (var i = 0; i < count; i++) {
      var px = Math.random() * W;
      var py = Math.random() * H;
      particles.push({
        x: px, y: py,
        homeX: px, homeY: py,
        vx: 0, vy: 0,
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 0.8,
        ampX: 5 + Math.random() * 3,
        ampY: 5 + Math.random() * 3,
        rippleInfluence: 0,
      });
    }
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
    buildParticles();
    ripples = [];
    scheduleNextRipple();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.04, (now - lastTime) / 1000);
    lastTime = now;
    var t = now * 0.001;

    nextRippleIn -= dt;
    if (nextRippleIn <= 0) {
      spawnRipple();
      scheduleNextRipple();
    }

    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var rr = ripples[ri];
      var step = rr.speed * dt;
      // Move wavefront position along its travel direction
      if (rr.dx !== 0) rr.pos += rr.dx * step;
      else rr.pos += rr.dy * step;
      rr.distTraveled += step;
      if (rr.distTraveled > rr.maxDist) {
        ripples.splice(ri, 1);
      }
    }

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    var haveMouse = !isPreview && mouseX > -9000;
    var MOUSE_R_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var sx = Math.sin(t * p.freq + p.phase) * p.ampX;
      var sy = Math.cos(t * p.freq * 0.83 + p.phase + 1.3) * p.ampY;
      var targetX = p.homeX + sx;
      var targetY = p.homeY + sy;

      p.vx += (targetX - p.x) * SPRING * dt;
      p.vy += (targetY - p.y) * SPRING * dt;

      if (haveMouse) {
        var dxm = p.x - mouseX;
        var dym = p.y - mouseY;
        var dSq = dxm * dxm + dym * dym;
        if (dSq < MOUSE_R_SQ && dSq > 0.5) {
          var dist = Math.sqrt(dSq);
          var fall = 1 - dist / MOUSE_RADIUS;
          var force = fall * fall * MOUSE_PUSH;
          p.vx += (dxm / dist) * force * dt;
          p.vy += (dym / dist) * force * dt;
        }
      }

      p.rippleInfluence = 0;
      for (var ri = 0; ri < ripples.length; ri++) {
        var r = ripples[ri];
        // Particle's coordinate on the ripple's travel axis
        var pCoord = r.dx !== 0 ? p.x : p.y;
        // Signed distance from wavefront to particle, in the travel direction.
        // Positive = particle is behind the wavefront (already passed).
        var dir = r.dx !== 0 ? r.dx : r.dy;
        var behind = (r.pos - pCoord) * dir;
        if (behind >= 0 && behind < RIPPLE_FADE_WIDTH) {
          var infl = 1 - behind / RIPPLE_FADE_WIDTH;
          var displaceForce = infl * RIPPLE_DISPLACE * SPRING;
          p.vx += r.dx * displaceForce * dt;
          p.vy += r.dy * displaceForce * dt;
          if (infl > p.rippleInfluence) p.rippleInfluence = infl;
        }
      }

      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ri2 = p.rippleInfluence;
      var cr = COLOR_BASE[0] + (COLOR_RIPPLE[0] - COLOR_BASE[0]) * ri2;
      var cg = COLOR_BASE[1] + (COLOR_RIPPLE[1] - COLOR_BASE[1]) * ri2;
      var cb = COLOR_BASE[2] + (COLOR_RIPPLE[2] - COLOR_BASE[2]) * ri2;
      var alpha = 0.4 + 0.2 * ri2;

      ctx.fillStyle = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function init(opts) {
    opts = opts || {};
    isPreview = !!opts.preview;
    canvas = opts.canvas || document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W = opts.width  || window.innerWidth;
    H = opts.height || window.innerHeight;

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
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    particles = [];
    ripples = [];
    canvas = ctx = null;
    resizeHandler = mouseHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
    isPreview = false;
    nextRippleIn = 0;
  }

  window.Atmospheres.kinetic = { init, destroy };
})();
