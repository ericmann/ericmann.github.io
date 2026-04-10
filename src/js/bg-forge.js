// ═══════════════════════════════════════
// FORGE — blacksmith's forge embers
// Glowing embers drift upward from a radial amber-to-black gradient
// "forge mouth" at the bottom of the viewport. Occasional spark rockets
// streak upward and burst into scattering sparklets. Cursor motion acts
// as bellows — embers near the pointer blow opposite to cursor velocity.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let embers = [], rockets = [], sparklets = [];
  let W = 0, H = 0, dpr = 1;
  let isPreview = false;
  let lastTime = 0;

  let mouseX = -9999, mouseY = -9999;
  let prevMouseX = -9999, prevMouseY = -9999;
  let mouseVX = 0, mouseVY = 0;

  let rocketTimer = 0;

  const EMBER_COUNT = 150;
  const EMBER_COUNT_PREVIEW = 50;
  const EMBER_SPEED = 30;
  const EMBER_DRIFT_X = 15;
  const EMBER_LIFE_MIN = 5.0;
  const EMBER_LIFE_MAX = 7.0;
  const EMBER_RADIUS_MIN = 2;
  const EMBER_RADIUS_MAX = 5;

  const ROCKET_INTERVAL_MIN = 2.0;
  const ROCKET_INTERVAL_MAX = 4.0;
  const ROCKET_SPEED = 250;
  const SPARKLET_COUNT_MIN = 8;
  const SPARKLET_COUNT_MAX = 15;
  const SPARKLET_LIFE = 0.6;
  const SPARKLET_SPEED_MIN = 60;
  const SPARKLET_SPEED_MAX = 180;

  const MOUSE_RADIUS = 150;
  const MOUSE_INFLUENCE = 80;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnEmber() {
    return {
      x: Math.random() * W,
      y: H + rand(0, 20),
      vx: (Math.random() - 0.5) * EMBER_DRIFT_X * 2,
      vy: -rand(EMBER_SPEED * 0.7, EMBER_SPEED * 1.3),
      age: 0,
      lifetime: rand(EMBER_LIFE_MIN, EMBER_LIFE_MAX),
      radius: rand(EMBER_RADIUS_MIN, EMBER_RADIUS_MAX),
      phase: Math.random() * Math.PI * 2,
      flickerSpeed: rand(3, 7),
    };
  }

  function spawnRocket() {
    return {
      x: rand(W * 0.15, W * 0.85),
      y: H + 5,
      vy: -ROCKET_SPEED,
      burstAlt: rand(H * 0.0, H * 0.6),
      age: 0,
      radius: 2.5,
    };
  }

  function burstRocket(rocket) {
    var count = Math.floor(rand(SPARKLET_COUNT_MIN, SPARKLET_COUNT_MAX + 1));
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = rand(SPARKLET_SPEED_MIN, SPARKLET_SPEED_MAX);
      sparklets.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        lifetime: SPARKLET_LIFE,
        radius: rand(1.0, 2.5),
      });
    }
  }

  function emberAlpha(progress) {
    if (progress < 0.15) return progress / 0.15;
    if (progress > 0.7) return 1 - (progress - 0.7) / 0.3;
    return 1;
  }

  function drawBackground() {
    var grd = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, Math.max(W, H) * 0.9);
    grd.addColorStop(0, '#2a0e00');
    grd.addColorStop(0.3, '#140700');
    grd.addColorStop(0.7, '#080200');
    grd.addColorStop(1, '#000000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
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

  function seedEmbers() {
    var count = isPreview ? EMBER_COUNT_PREVIEW : EMBER_COUNT;
    embers = [];
    for (var i = 0; i < count; i++) {
      var e = spawnEmber();
      e.age = Math.random() * e.lifetime;
      e.y = H - (e.age / e.lifetime) * H * 1.1;
      embers.push(e);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    var targetCount = isPreview ? EMBER_COUNT_PREVIEW : EMBER_COUNT;

    drawBackground();

    ctx.globalCompositeOperation = 'lighter';

    // --- Rockets ---
    rocketTimer -= dt;
    if (rocketTimer <= 0) {
      rockets.push(spawnRocket());
      rocketTimer = rand(ROCKET_INTERVAL_MIN, ROCKET_INTERVAL_MAX);
    }

    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.y += r.vy * dt;
      r.age += dt;

      if (r.y <= r.burstAlt) {
        burstRocket(r);
        rockets.splice(i, 1);
        continue;
      }

      var rAlpha = 0.9;
      var grd = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius * 3);
      grd.addColorStop(0, 'rgba(255, 200, 80, ' + rAlpha + ')');
      grd.addColorStop(0.5, 'rgba(255, 96, 32, ' + (rAlpha * 0.5) + ')');
      grd.addColorStop(1, 'rgba(255, 96, 32, 0)');
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // --- Sparklets ---
    for (var i = sparklets.length - 1; i >= 0; i--) {
      var s = sparklets[i];
      s.age += dt;
      if (s.age >= s.lifetime) {
        sparklets.splice(i, 1);
        continue;
      }

      s.vy += 120 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= (1 - 2.0 * dt);

      var sp = s.age / s.lifetime;
      var sAlpha = (1 - sp) * (1 - sp);

      var sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2);
      sg.addColorStop(0, 'rgba(255, 220, 120, ' + sAlpha.toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(255, 96, 32, 0)');
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
    }

    // --- Embers ---
    while (embers.length < targetCount) {
      embers.push(spawnEmber());
    }

    for (var i = embers.length - 1; i >= 0; i--) {
      var e = embers[i];
      e.age += dt;
      if (e.age >= e.lifetime) {
        embers[i] = spawnEmber();
        continue;
      }

      var windX = 0;
      if (!isPreview && mouseX > -9000) {
        var dx = e.x - mouseX;
        var dy = e.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          var influence = (1 - dist / MOUSE_RADIUS);
          influence *= influence;
          windX = -mouseVX * influence * MOUSE_INFLUENCE / EMBER_SPEED;
        }
      }

      e.x += (e.vx + windX) * dt;
      e.y += e.vy * dt;

      if (e.x < -20) e.x += W + 40;
      if (e.x > W + 20) e.x -= W + 40;

      var progress = e.age / e.lifetime;
      var alpha = emberAlpha(progress);

      var flicker = 0.6 + 0.4 * Math.sin(e.phase + now * 0.001 * e.flickerSpeed);
      alpha *= flicker;

      var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      g.addColorStop(0, 'rgba(255, 96, 32, ' + (alpha * 0.9).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255, 96, 32, 0)');
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = g;
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

    applySize();
    seedEmbers();
    rocketTimer = rand(0.5, 1.5);
    rockets = [];
    sparklets = [];

    mouseX = mouseY = prevMouseX = prevMouseY = -9999;
    mouseVX = mouseVY = 0;

    if (!isPreview) {
      resizeHandler = function() {
        applySize();
        seedEmbers();
      };
      window.addEventListener('resize', resizeHandler);

      mouseHandler = function(e) {
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (prevMouseX > -9000) {
          mouseVX = mouseX - prevMouseX;
          mouseVY = mouseY - prevMouseY;
        }
      };
      document.addEventListener('mousemove', mouseHandler);

      mouseLeaveHandler = function() {
        mouseX = mouseY = -9999;
        mouseVX = mouseVY = 0;
      };
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
    embers = [];
    rockets = [];
    sparklets = [];
    rocketTimer = 0;
    canvas = ctx = null;
    mouseHandler = resizeHandler = mouseLeaveHandler = null;
    mouseX = mouseY = prevMouseX = prevMouseY = -9999;
    mouseVX = mouseVY = 0;
    isPreview = false;
  }

  window.Atmospheres.forge = { init, destroy };
})();
