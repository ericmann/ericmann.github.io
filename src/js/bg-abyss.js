// ═══════════════════════════════════════
// ABYSS — super rare (0.25%)
// The void absorbs the cursor's kinetic energy. Each cursor move spawns
// soft glowing particles that drift in the direction of travel, grow as
// they fade, and stack additively to form clean fluid-like trails.
// Inspired by the splash-cursor effect on dalelarroder.com.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler;
  let particles = [];
  let W = 0, H = 0, dpr = 1;
  let lastMouseX = -9999, lastMouseY = -9999, lastMouseTime = 0;
  let lastTime = 0;
  let hueCycle = 0;

  function init() {
    canvas = document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    function applySize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    applySize();
    resizeHandler = applySize;
    window.addEventListener('resize', resizeHandler);

    mouseHandler = e => {
      const x = e.clientX;
      const y = e.clientY;
      const now = performance.now();

      if (lastMouseX !== -9999) {
        const dx = x - lastMouseX;
        const dy = y - lastMouseY;
        const dt = Math.max(0.001, (now - lastMouseTime) / 1000);
        const vx = dx / dt;
        const vy = dy / dt;
        const dist = Math.hypot(dx, dy);

        // Spawn particles spread along the cursor's path so a fast flick
        // produces a continuous trail rather than discrete blobs.
        const count = Math.min(1 + Math.floor(dist / 14), 5);
        for (let i = 0; i < count; i++) {
          const tt = (i + 1) / (count + 1);
          const px = lastMouseX + dx * tt;
          const py = lastMouseY + dy * tt;

          // Slow oscillation between cyan (184) and magenta (320), with the
          // occasional amber (40) accent — all from the site's :root palette.
          hueCycle += 0.6;
          const wave = Math.sin(hueCycle * 0.03);
          let hue;
          if (Math.random() < 0.06)      hue = 40;                 // rare amber
          else if (wave > 0)              hue = 320 + (Math.random() - 0.5) * 18;
          else                            hue = 184 + (Math.random() - 0.5) * 18;

          particles.push({
            x: px,
            y: py,
            vx: vx * 0.18 + (Math.random() - 0.5) * 60,
            vy: vy * 0.18 + (Math.random() - 0.5) * 60,
            size: 28 + Math.random() * 22,
            life: 1,
            hue,
          });
        }
      }

      lastMouseX = x;
      lastMouseY = y;
      lastMouseTime = now;
    };
    document.addEventListener('mousemove', mouseHandler);

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Soft fade layer — keeps a bit of trail without smearing forever.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5, 5, 16, 0.18)';
    ctx.fillRect(0, 0, W, H);

    // Additive blending so overlapping particles bloom into a clean glow.
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;       // friction — particles slow as they drift
      p.vy *= 0.93;
      p.life -= dt * 1.4; // lifetime ~0.7s
      p.size += dt * 36;  // grow as they fade — smoke-like dispersion

      if (p.life <= 0) { particles.splice(i, 1); continue; }

      const a = p.life * 0.55;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0,    `hsla(${p.hue}, 100%, 75%, ${a})`);
      grad.addColorStop(0.35, `hsla(${p.hue}, 100%, 55%, ${a * 0.45})`);
      grad.addColorStop(1,    `hsla(${p.hue}, 100%, 30%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
    particles = [];
    canvas = ctx = null;
    mouseHandler = resizeHandler = null;
    lastMouseX = lastMouseY = -9999;
    lastMouseTime = 0;
    hueCycle = 0;
  }

  window.Atmospheres.abyss = { init, destroy };
})();
