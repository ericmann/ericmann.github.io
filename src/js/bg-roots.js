// ═══════════════════════════════════════
// ROOTS — fractal tree growth
// Branches slowly grow upward from the bottom edge over 30-60 seconds.
// Stochastic branching with mouse-accelerated growth. Ice-blue palette
// on near-black (#050510).
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let resizeHandler, mouseHandler, mouseLeaveHandler;
  let trees = [];
  let W = 0, H = 0, dpr = 1;
  let mouseX = -9999, mouseY = -9999;
  let lastTime = 0;
  let isPreview = false;

  const MAX_DEPTH = 7;
  const BRANCH_SPAWN_THRESHOLD = 0.7;
  const MOUSE_RADIUS = 120;
  const MOUSE_ACCEL = 3;
  const TRUNK_WIDTH = 2.5;
  const TIP_WIDTH = 0.5;
  const LEAF_CHANCE = 0.35;
  const LEAF_RADIUS_MIN = 1.5;
  const LEAF_RADIUS_MAX = 3;

  function makeBranch(x, y, angle, maxLength, depth) {
    return {
      startX: x,
      startY: y,
      angle: angle,
      growth: 0,
      maxLength: maxLength,
      depth: depth,
      children: [],
      spawned: false,
      growthSpeed: (0.3 + Math.random() * 0.3) / (1 + depth * 0.4),
      hasLeaf: depth >= 5 && Math.random() < LEAF_CHANCE,
      leafRadius: LEAF_RADIUS_MIN + Math.random() * (LEAF_RADIUS_MAX - LEAF_RADIUS_MIN),
    };
  }

  function tipX(b) {
    return b.startX + Math.cos(b.angle) * b.maxLength * b.growth;
  }

  function tipY(b) {
    return b.startY + Math.sin(b.angle) * b.maxLength * b.growth;
  }

  function spawnChildren(branch) {
    if (branch.spawned || branch.depth >= MAX_DEPTH) return;
    branch.spawned = true;

    var count = 2 + Math.floor(Math.random() * 2);
    var tx = tipX(branch);
    var ty = tipY(branch);
    var childDepth = branch.depth + 1;

    for (var i = 0; i < count; i++) {
      var spread = (20 + Math.random() * 15) * (Math.PI / 180);
      var side = (i === 0) ? -1 : (i === 1) ? 1 : (Math.random() < 0.5 ? -1 : 1);
      var childAngle = branch.angle + spread * side;
      var lengthFactor = 0.7 + Math.random() * 0.15;
      var childLength = branch.maxLength * lengthFactor;

      branch.children.push(makeBranch(tx, ty, childAngle, childLength, childDepth));
    }
  }

  function createTree(x) {
    var baseAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    var baseLength = H * (0.15 + Math.random() * 0.1);
    return makeBranch(x, H, baseAngle, baseLength, 0);
  }

  function countBranches(branch) {
    var n = 1;
    for (var i = 0; i < branch.children.length; i++) {
      n += countBranches(branch.children[i]);
    }
    return n;
  }

  function updateBranch(branch, dt, accel) {
    if (branch.growth < 1) {
      var speed = branch.growthSpeed * accel;

      var tx = tipX(branch);
      var ty = tipY(branch);
      var dx = tx - mouseX;
      var dy = ty - mouseY;
      if (dx * dx + dy * dy < MOUSE_RADIUS * MOUSE_RADIUS) {
        speed *= MOUSE_ACCEL;
      }

      branch.growth = Math.min(1, branch.growth + speed * dt);
    }

    if (branch.growth >= BRANCH_SPAWN_THRESHOLD && !branch.spawned) {
      spawnChildren(branch);
    }

    for (var i = 0; i < branch.children.length; i++) {
      updateBranch(branch.children[i], dt, accel);
    }
  }

  function drawBranch(branch) {
    if (branch.growth <= 0) return;

    var tx = tipX(branch);
    var ty = tipY(branch);

    var depthRatio = branch.depth / MAX_DEPTH;
    var lineWidth = TRUNK_WIDTH - depthRatio * (TRUNK_WIDTH - TIP_WIDTH);
    var alpha = 0.3 + (1 - depthRatio) * 0.4;

    if (branch.growth < 1) {
      alpha += 0.15;
    }

    ctx.beginPath();
    ctx.moveTo(branch.startX, branch.startY);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = 'rgba(200,220,240,' + Math.min(alpha, 0.85).toFixed(3) + ')';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (branch.hasLeaf && branch.growth >= 1) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,220,240,0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(tx, ty, branch.leafRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,220,240,0.5)';
      ctx.fill();
      ctx.restore();
    }

    for (var i = 0; i < branch.children.length; i++) {
      drawBranch(branch.children[i]);
    }
  }

  function preGrow(branch, fraction) {
    branch.growth = Math.min(1, fraction + Math.random() * 0.15);

    if (branch.growth >= BRANCH_SPAWN_THRESHOLD && !branch.spawned && branch.depth < MAX_DEPTH) {
      spawnChildren(branch);
      var childFraction = (fraction - BRANCH_SPAWN_THRESHOLD) / (1 - BRANCH_SPAWN_THRESHOLD);
      if (childFraction > 0) {
        for (var i = 0; i < branch.children.length; i++) {
          preGrow(branch.children[i], childFraction * 0.7);
        }
      }
    }
  }

  function initTrees() {
    trees = [];
    var count = isPreview ? 3 : 4 + Math.floor(Math.random() * 2);
    var spacing = W / (count + 1);

    for (var i = 0; i < count; i++) {
      var x = spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.4;
      var tree = createTree(x);
      if (isPreview) {
        preGrow(tree, 0.4);
      }
      trees.push(tree);
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
    initTrees();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    var accel = isPreview ? 2.5 : 1;

    for (var i = 0; i < trees.length; i++) {
      updateBranch(trees[i], dt, accel);
    }

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < trees.length; i++) {
      drawBranch(trees[i]);
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
      resizeHandler = function() {
        applySize();
      };
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
    trees = [];
    canvas = ctx = null;
    mouseHandler = resizeHandler = mouseLeaveHandler = null;
    mouseX = mouseY = -9999;
    isPreview = false;
  }

  window.Atmospheres.roots = { init, destroy };
})();
