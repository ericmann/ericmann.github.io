// ═══════════════════════════════════════
// FIREFLIES — warm
// Amber firefly particles drifting with organic noise-based motion,
// pulsing glow on randomized sine cycles, soft mouse repulsion.
// The only atmosphere that breaks the cyan/magenta palette — pure amber/gold.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler;
  let fireflies = [];
  let W = 0, H = 0, dpr = 1;
  let mouseX = -9999, mouseY = -9999;
  let lastTime = 0;
  let isPreview = false;

  var REPEL_RADIUS = 100;
  var REPEL_FORCE = 600;
  var STUN_DURATION = 0.3;
  var INTER_REPEL_RADIUS = 50;
  var INTER_REPEL_FORCE = 40;

  function createFirefly() {
    var speed = 10 + Math.random() * 20;
    var angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseSpeed: speed,
      radius: 20 + Math.random() * 20,
      baseGlow: 0.5 + Math.random() * 0.5,
      freq: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      driftAngle: Math.random() * Math.PI * 2,
      driftRate: 0.3 + Math.random() * 0.7,
      stunTimer: 0,
    };
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

    var count = isPreview ? 20 : 40 + Math.floor(Math.random() * 21);
    fireflies = [];
    for (var i = 0; i < count; i++) {
      fireflies.push(createFirefly());
    }

    if (!isPreview) {
      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      };
      document.addEventListener('mousemove', mouseHandler);
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    var t = now / 1000;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';

    for (var i = 0; i < fireflies.length; i++) {
      var f = fireflies[i];

      if (f.stunTimer > 0) {
        f.stunTimer -= dt;
      } else {
        f.driftAngle += (Math.random() - 0.5) * f.driftRate * dt * 4;
        var targetVx = Math.cos(f.driftAngle) * f.baseSpeed;
        var targetVy = Math.sin(f.driftAngle) * f.baseSpeed;
        var smoothing = 1 - Math.pow(0.03, dt);
        f.vx += (targetVx - f.vx) * smoothing;
        f.vy += (targetVy - f.vy) * smoothing;
      }

      if (!isPreview && mouseX > -9000) {
        var dmx = f.x - mouseX;
        var dmy = f.y - mouseY;
        var distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < REPEL_RADIUS && distMouse > 0.1) {
          var repelStrength = (1 - distMouse / REPEL_RADIUS);
          repelStrength *= repelStrength;
          var nx = dmx / distMouse;
          var ny = dmy / distMouse;
          f.vx += nx * REPEL_FORCE * repelStrength * dt;
          f.vy += ny * REPEL_FORCE * repelStrength * dt;
          f.stunTimer = STUN_DURATION;
        }
      }

      for (var j = i + 1; j < fireflies.length; j++) {
        var other = fireflies[j];
        var dx = f.x - other.x;
        var dy = f.y - other.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < INTER_REPEL_RADIUS && dist > 0.1) {
          var push = (1 - dist / INTER_REPEL_RADIUS) * INTER_REPEL_FORCE * dt;
          var rnx = dx / dist;
          var rny = dy / dist;
          f.vx += rnx * push;
          f.vy += rny * push;
          other.vx -= rnx * push;
          other.vy -= rny * push;
        }
      }

      f.x += f.vx * dt;
      f.y += f.vy * dt;

      if (f.x < -f.radius) f.x += W + f.radius * 2;
      else if (f.x > W + f.radius) f.x -= W + f.radius * 2;
      if (f.y < -f.radius) f.y += H + f.radius * 2;
      else if (f.y > H + f.radius) f.y -= H + f.radius * 2;

      var sinVal = Math.sin(t * f.freq + f.phase);
      var glow = f.baseGlow * (0.4 + 0.6 * sinVal * sinVal);

      var grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      grad.addColorStop(0,   'rgba(255, 170, 0, ' + glow + ')');
      grad.addColorStop(0.4, 'rgba(255, 140, 0, ' + (glow * 0.4) + ')');
      grad.addColorStop(1,   'rgba(255, 100, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    fireflies = [];
    canvas = ctx = null;
    mouseHandler = resizeHandler = null;
    mouseX = mouseY = -9999;
    lastTime = 0;
    isPreview = false;
  }

  window.Atmospheres.fireflies = { init, destroy };
})();
