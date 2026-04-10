// ═══════════════════════════════════════
// ABYSS — exotic
// The void absorbs the cursor's kinetic energy. Each cursor move spawns
// soft glowing particles that drift in the direction of travel, grow as
// they fade, and stack additively to form clean fluid-like trails.
// In preview mode, autonomous particles emit gently from the center.
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
  let isPreview = false;

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

          const count = Math.min(1 + Math.floor(dist / 14), 5);
          for (let i = 0; i < count; i++) {
            const tt = (i + 1) / (count + 1);
            const px = lastMouseX + dx * tt;
            const py = lastMouseY + dy * tt;

            hueCycle += 0.6;
            const wave = Math.sin(hueCycle * 0.03);
            let hue;
            if (Math.random() < 0.06)      hue = 40;
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
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // In preview mode, emit gentle autonomous particles
    if (isPreview && Math.random() < 0.15) {
      hueCycle += 0.6;
      const wave = Math.sin(hueCycle * 0.03);
      let hue;
      if (Math.random() < 0.06)      hue = 40;
      else if (wave > 0)              hue = 320 + (Math.random() - 0.5) * 18;
      else                            hue = 184 + (Math.random() - 0.5) * 18;

      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.4,
        y: H / 2 + (Math.random() - 0.5) * H * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 16 + Math.random() * 14,
        life: 1,
        hue,
      });
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5, 5, 16, 0.18)';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= dt * 1.4;
      p.size += dt * 36;

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
    isPreview = false;
  }

  window.Atmospheres.abyss = { init, destroy };
})();
