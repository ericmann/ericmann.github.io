// ═══════════════════════════════════════
// DUNES — super rare (0.25%)
// A subtle sand sculpture in the silhouette of Mt Hood, made of ~1800
// particles. Each grain remembers its home position and is held there by
// a spring force, with a small per-grain ambient shimmer so the sculpture
// is never fully still. The cursor repels nearby grains; the moment it
// moves on, the spring pulls the sand back into shape.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let particles = [];
  let grainSprite = null;
  let W = 0, H = 0, dpr = 1;
  let mouseX = -9999, mouseY = -9999;
  let lastTime = 0;

  const PARTICLE_TARGET = 1800;
  const REPEL_RADIUS = 200;
  const REPEL_STRENGTH = 2800;
  const SPRING = 9.5;       // pull strength toward home
  const DAMPING = 0.86;     // velocity friction per frame
  const GRAIN_SIZE = 22;    // sprite dimensions in px

  // Mt Hood profile authored in visual order (left to right as it appears
  // on screen). The mountain occupies ~55% of the viewport width — much
  // wider than a peninsula — with foothills extending out on both sides.
  // The long asymmetric shoulder is on the LEFT, with the Crater Rock bump
  // partway up that side. The summit is a rounded dome slightly right of
  // center, and a steeper descent runs down the right side.
  const HOOD_PROFILE = [
    [0.000, 0.04],
    [0.040, 0.06],
    [0.085, 0.05],
    [0.130, 0.08], // small foothill bump
    [0.170, 0.06],
    [0.205, 0.09],
    [0.240, 0.13], // foothills rising
    [0.275, 0.18],
    [0.305, 0.24],
    [0.335, 0.31],
    [0.360, 0.38], // shoulder rise begins
    [0.385, 0.45],
    [0.410, 0.52],
    [0.435, 0.58],
    [0.460, 0.62], // shoulder plateau
    [0.480, 0.63], // Crater Rock bump
    [0.500, 0.62],
    [0.520, 0.60], // shoulder ends
    [0.540, 0.62], // resumes climb to summit
    [0.555, 0.68],
    [0.570, 0.75],
    [0.585, 0.83],
    [0.598, 0.90],
    [0.608, 0.95],
    [0.617, 0.98],
    [0.625, 1.00], // ── rounded summit dome ──
    [0.635, 1.00],
    [0.645, 0.99],
    [0.655, 0.96],
    [0.665, 0.92],
    [0.678, 0.85],
    [0.692, 0.76],
    [0.708, 0.65],
    [0.725, 0.53],
    [0.745, 0.41],
    [0.770, 0.30],
    [0.800, 0.21],
    [0.835, 0.14],
    [0.875, 0.10],
    [0.920, 0.07],
    [0.960, 0.05],
    [1.000, 0.04],
  ];

  // Sample the mountain surface y at a given normalized x ∈ [0, 1].
  function surfaceY(u) {
    const FOOT_Y = H * 0.67;          // foothills sit ~1/3 up from the bottom
    const PEAK_Y = H * 0.18;          // summit unchanged
    const RANGE = FOOT_Y - PEAK_Y;
    if (u <= HOOD_PROFILE[0][0]) return FOOT_Y - HOOD_PROFILE[0][1] * RANGE;
    for (let i = 1; i < HOOD_PROFILE.length; i++) {
      const x0 = HOOD_PROFILE[i - 1][0];
      const x1 = HOOD_PROFILE[i][0];
      if (u <= x1) {
        const t = (u - x0) / (x1 - x0);
        const h = HOOD_PROFILE[i - 1][1] + (HOOD_PROFILE[i][1] - HOOD_PROFILE[i - 1][1]) * t;
        return FOOT_Y - h * RANGE;
      }
    }
    return FOOT_Y - HOOD_PROFILE[HOOD_PROFILE.length - 1][1] * RANGE;
  }

  // Pre-rendered soft glow sprite — drawn once, blitted per particle.
  // Cool blue-white tuned subtle so additive stacking doesn't drown out text.
  function makeGrainSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = GRAIN_SIZE;
    const g = c.getContext('2d');
    const cx = GRAIN_SIZE / 2;
    const grad = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0,    'rgba(238, 244, 255, 0.30)'); // site --text-bright
    grad.addColorStop(0.30, 'rgba(180, 215, 240, 0.15)'); // cool blue tint
    grad.addColorStop(0.65, 'rgba(80, 130, 190, 0.05)');  // faint cyan halo
    grad.addColorStop(1,    'rgba(20, 40, 80, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, GRAIN_SIZE, GRAIN_SIZE);
    return c;
  }

  function init() {
    canvas = document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    grainSprite = makeGrainSprite();

    function applySize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }
    applySize();
    resizeHandler = applySize;
    window.addEventListener('resize', resizeHandler);

    mouseHandler = e => { mouseX = e.clientX; mouseY = e.clientY; };
    document.addEventListener('mousemove', mouseHandler);

    // Pull the cursor "away" when it leaves the window so the sculpture reforms.
    mouseLeaveHandler = () => { mouseX = -9999; mouseY = -9999; };
    document.addEventListener('mouseleave', mouseLeaveHandler);

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function buildParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_TARGET; i++) {
      const u = Math.random();
      const surface = surfaceY(u);
      const depth = (H - surface);
      // Bias toward the top of the dune so the silhouette reads sharply.
      const t = Math.pow(Math.random(), 1.6);
      const py = surface + t * depth;
      const px = u * W + (Math.random() - 0.5) * 1.5;
      particles.push({
        x: px, y: py,
        homeX: px, homeY: py,
        vx: 0, vy: 0,
        // Per-grain ambient shimmer parameters.
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 1.2,
        amp:  0.6 + Math.random() * 0.9,
      });
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.04, (now - lastTime) / 1000);
    lastTime = now;
    const t = now * 0.001;

    // Hard clear — no trails. The sculpture reads as itself, not motion blur.
    ctx.clearRect(0, 0, W, H);

    const REPEL_R_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const haveMouse = mouseX > -9000;

    for (const p of particles) {
      // Ambient shimmer: oscillate the spring target so the grain is never
      // at perfect rest. Each grain has a unique phase / frequency / amplitude.
      const sx = Math.sin(t * p.freq + p.phase) * p.amp;
      const sy = Math.cos(t * p.freq * 0.83 + p.phase) * p.amp * 0.6;
      const targetX = p.homeX + sx;
      const targetY = p.homeY + sy;

      // Spring back to (shimmering) home.
      p.vx += (targetX - p.x) * SPRING * dt;
      p.vy += (targetY - p.y) * SPRING * dt;

      // Cursor repulsion within a soft radius.
      if (haveMouse) {
        const dxm = p.x - mouseX;
        const dym = p.y - mouseY;
        const dSq = dxm * dxm + dym * dym;
        if (dSq < REPEL_R_SQ && dSq > 0.5) {
          const dist = Math.sqrt(dSq);
          const fall = 1 - dist / REPEL_RADIUS;
          const force = fall * fall * REPEL_STRENGTH;
          p.vx += (dxm / dist) * force * dt;
          p.vy += (dym / dist) * force * dt;
        }
      }

      // Damping.
      p.vx *= DAMPING;
      p.vy *= DAMPING;

      // Integrate.
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Render — additive blits of the grain sprite so overlapping grains
    // bloom the silhouette without producing hard pixels.
    ctx.globalCompositeOperation = 'lighter';
    const half = GRAIN_SIZE / 2;
    for (const p of particles) {
      ctx.drawImage(grainSprite, p.x - half, p.y - half);
    }
    ctx.globalCompositeOperation = 'source-over';
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
    grainSprite = null;
    canvas = ctx = null;
    mouseHandler = resizeHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
  }

  window.Atmospheres.dunes = { init, destroy };
})();
