// ═══════════════════════════════════════
// CONSTELLATION — circuit-board star traces
// Stationary nodes with Manhattan-routed edges that unlock as the user
// scrolls. Peak scroll is remembered until reload so traces never vanish.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, scrollHandler;
  let nodes = [], edges = [];
  let W = 0, H = 0, dpr = 1;
  let peakScroll = 0;
  let isPreview = false;
  let lastTime = 0;

  const CYAN = '#00f0ff';
  const AMBER = '#ffaa00';
  const TRACE_ALPHA = 0.4;
  const NODE_RADIUS = 2;
  const SOLDER_RADIUS = 3.5;
  const LERP_SPEED = 1.8;
  const PULSE_DURATION = 0.6;

  function poissonDisk(w, h, minDist, count) {
    const pts = [];
    const cellSize = minDist / Math.SQRT2;
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);
    const grid = new Array(cols * rows).fill(-1);
    const active = [];

    function gridIdx(x, y) {
      return Math.floor(x / cellSize) + Math.floor(y / cellSize) * cols;
    }

    function addPoint(x, y) {
      const i = pts.length;
      pts.push({ x, y });
      grid[gridIdx(x, y)] = i;
      active.push(i);
    }

    addPoint(w * 0.5, h * 0.5);

    while (active.length > 0 && pts.length < count) {
      const ri = Math.floor(Math.random() * active.length);
      const pi = active[ri];
      const base = pts[pi];
      let found = false;

      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = minDist + Math.random() * minDist;
        const nx = base.x + Math.cos(angle) * dist;
        const ny = base.y + Math.sin(angle) * dist;

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

        const ci = Math.floor(nx / cellSize);
        const cj = Math.floor(ny / cellSize);
        let ok = true;

        for (let di = -2; di <= 2 && ok; di++) {
          for (let dj = -2; dj <= 2 && ok; dj++) {
            const ni2 = ci + di;
            const nj2 = cj + dj;
            if (ni2 < 0 || ni2 >= cols || nj2 < 0 || nj2 >= rows) continue;
            const gi = grid[ni2 + nj2 * cols];
            if (gi >= 0) {
              const dx = pts[gi].x - nx;
              const dy = pts[gi].y - ny;
              if (dx * dx + dy * dy < minDist * minDist) ok = false;
            }
          }
        }

        if (ok) {
          addPoint(nx, ny);
          found = true;
          break;
        }
      }

      if (!found) active.splice(ri, 1);
    }

    return pts;
  }

  function buildGraph(nodeCount, edgeCount) {
    const margin = 40;
    const minDist = Math.sqrt((W * H) / (nodeCount * 1.8));
    const raw = poissonDisk(W - margin * 2, H - margin * 2, minDist, nodeCount);

    nodes = raw.map(p => ({
      x: p.x + margin,
      y: p.y + margin,
      pulseTime: -1,
    }));

    const maxEdgeDist = minDist * 3;
    const candidates = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxEdgeDist) candidates.push({ i, j, d });
      }
    }

    candidates.sort((a, b) => a.d - b.d);

    const degreeLimit = 4;
    const degree = new Uint8Array(nodes.length);
    edges = [];

    for (const c of candidates) {
      if (edges.length >= edgeCount) break;
      if (degree[c.i] >= degreeLimit || degree[c.j] >= degreeLimit) continue;
      degree[c.i]++;
      degree[c.j]++;

      const a = nodes[c.i];
      const b = nodes[c.j];
      edges.push({
        from: c.i,
        to: c.j,
        waypoints: manhattanRoute(a.x, a.y, b.x, b.y),
        progress: 0,
        target: 0,
        wasComplete: false,
      });
    }
  }

  function manhattanRoute(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const pts = [{ x: x1, y: y1 }];

    if (absDx < 4 && absDy < 4) {
      pts.push({ x: x2, y: y2 });
      return pts;
    }

    const diagDist = Math.min(absDx, absDy);
    const diagX = Math.sign(dx);
    const diagY = Math.sign(dy);

    const splitRatio = 0.3 + Math.random() * 0.4;
    const diagUsed = diagDist * splitRatio;

    const midX = x1 + diagX * diagUsed;
    const midY = y1 + diagY * diagUsed;
    pts.push({ x: midX, y: midY });

    const remainX = x2 - midX;
    const remainY = y2 - midY;

    if (Math.abs(remainX) > Math.abs(remainY)) {
      const cornerX = midX + remainX;
      pts.push({ x: cornerX, y: midY });
      pts.push({ x: x2, y: y2 });
    } else {
      const cornerY = midY + remainY;
      pts.push({ x: midX, y: cornerY });
      pts.push({ x: x2, y: y2 });
    }

    return pts;
  }

  function totalPathLength(waypoints) {
    let len = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
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
    buildGraph(isPreview ? 30 : 80, isPreview ? 45 : 100);

    if (isPreview) {
      const unlockCount = Math.floor(edges.length * 0.6);
      for (let i = 0; i < unlockCount; i++) {
        edges[i].target = 1;
      }
    }
  }

  function updateScroll() {
    var docH = document.body.scrollHeight - window.innerHeight;
    var ratio = docH <= 0 ? 1 : Math.min(window.scrollY / docH, 1);
    if (ratio > peakScroll) peakScroll = ratio;

    var unlockCount = Math.floor(peakScroll * edges.length);
    for (var i = 0; i < edges.length; i++) {
      edges[i].target = i < unlockCount ? 1 : 0;
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.fill();
    }

    for (const e of edges) {
      e.progress += (e.target - e.progress) * LERP_SPEED * dt;
      if (Math.abs(e.progress - e.target) < 0.001) e.progress = e.target;

      if (e.progress < 0.001) continue;

      const wp = e.waypoints;
      const tLen = totalPathLength(wp);

      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);

      let drawn = 0;
      const maxDraw = e.progress * tLen;

      for (let i = 1; i < wp.length; i++) {
        const dx = wp[i].x - wp[i - 1].x;
        const dy = wp[i].y - wp[i - 1].y;
        const seg = Math.sqrt(dx * dx + dy * dy);

        if (drawn + seg <= maxDraw) {
          ctx.lineTo(wp[i].x, wp[i].y);
          drawn += seg;
        } else {
          const remain = maxDraw - drawn;
          const frac = seg > 0 ? remain / seg : 1;
          ctx.lineTo(wp[i - 1].x + dx * frac, wp[i - 1].y + dy * frac);
          break;
        }
      }

      ctx.strokeStyle = `rgba(0, 240, 255, ${TRACE_ALPHA * e.progress})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const justCompleted = e.progress > 0.99 && !e.wasComplete;
      if (justCompleted) {
        e.wasComplete = true;
        nodes[e.from].pulseTime = now;
        nodes[e.to].pulseTime = now;
      }
    }

    for (let ni = 0; ni < nodes.length; ni++) {
      const n = nodes[ni];
      const hasAnyEdge = edges.some(
        e => (e.from === ni || e.to === ni) && e.progress > 0.99
      );
      if (!hasAnyEdge) continue;

      let alpha = 0.7;
      if (n.pulseTime > 0) {
        const elapsed = (now - n.pulseTime) / 1000;
        if (elapsed < PULSE_DURATION) {
          alpha = 0.7 + 0.3 * (1 - elapsed / PULSE_DURATION);
        } else {
          n.pulseTime = -1;
        }
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, SOLDER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 170, 0, ${alpha})`;
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

    applySize();

    if (!isPreview) {
      scrollHandler = updateScroll;
      window.addEventListener('scroll', scrollHandler, { passive: true });

      resizeHandler = applySize;
      window.addEventListener('resize', resizeHandler);

      updateScroll();
    }

    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    nodes = [];
    edges = [];
    peakScroll = 0;
    canvas = ctx = null;
    scrollHandler = resizeHandler = null;
    isPreview = false;
  }

  window.Atmospheres.constellation = { init, destroy };
})();
