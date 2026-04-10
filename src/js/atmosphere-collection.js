(function() {
  var grid = document.getElementById('atmo-grid');
  if (!grid) return;

  var ATMOSPHERES = [
    { id: 'starfield',  name: 'Starfield',  rarity: 'default',    pct: '90%',   color: '--text-dim' },
    { id: 'vaporwave',  name: 'Vaporwave',  rarity: 'uncommon',   pct: '5%',    color: '--cyan' },
    { id: 'mobius',     name: 'Möbius',      rarity: 'rare',       pct: '3%',    color: '--cyan' },
    { id: 'tesseract',  name: 'Tesseract',   rarity: 'very-rare',  pct: '1.5%',  color: '--magenta' },
    { id: 'abyss',      name: 'Abyss',       rarity: 'super-rare', pct: '0.25%', color: '--amber' },
    { id: 'dunes',      name: 'Dunes',       rarity: 'super-rare', pct: '0.25%', color: '--amber' },
  ];

  var RARITY_LABELS = {
    'default':    'DEFAULT',
    'uncommon':   'UNCOMMON',
    'rare':       'RARE',
    'very-rare':  'VERY RARE',
    'super-rare': 'SUPER RARE'
  };

  function getSeen() {
    try {
      return JSON.parse(localStorage.getItem('eam_atmo_seen') || '[]');
    } catch (e) { return []; }
  }

  var seen = getSeen();
  var countEl = document.getElementById('atmo-count');
  if (countEl) countEl.textContent = seen.length;

  var activePreview = null;

  ATMOSPHERES.forEach(function(atmo) {
    var isSeen = seen.indexOf(atmo.id) !== -1;
    var card = document.createElement('div');
    card.className = 'atmo-card' + (isSeen ? '' : ' locked');

    var canvas = document.createElement('canvas');
    canvas.className = 'atmo-preview';
    canvas.width = 400;
    canvas.height = 225;
    card.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 400, 225);

    if (isSeen) {
      drawStaticPreview(ctx, atmo.id, 400, 225);
    }

    var info = document.createElement('div');
    info.className = 'atmo-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'atmo-name';
    nameEl.textContent = isSeen ? atmo.name : '???';
    info.appendChild(nameEl);

    var rarityEl = document.createElement('div');
    rarityEl.className = 'atmo-rarity ' + atmo.rarity;
    rarityEl.textContent = isSeen
      ? RARITY_LABELS[atmo.rarity] + ' — ' + atmo.pct
      : '??? — ?%';
    info.appendChild(rarityEl);

    var statusEl = document.createElement('div');
    statusEl.className = 'atmo-status' + (isSeen ? ' detected' : '');
    statusEl.textContent = isSeen ? 'DETECTED' : 'UNDETECTED';
    info.appendChild(statusEl);

    card.appendChild(info);

    if (isSeen) {
      card.addEventListener('mouseenter', function() {
        startLivePreview(canvas, atmo.id);
      });
      card.addEventListener('mouseleave', function() {
        stopLivePreview(canvas, atmo.id);
      });
    }

    grid.appendChild(card);
  });

  // ── Static single-frame preview ──
  function drawStaticPreview(ctx, id, w, h) {
    var previews = {
      starfield:  drawStarfieldFrame,
      vaporwave:  drawVaporwaveFrame,
      mobius:     drawMobiusFrame,
      tesseract:  drawTesseractFrame,
      abyss:      drawAbyssFrame,
      dunes:      drawDunesFrame
    };
    if (previews[id]) previews[id](ctx, w, h, 0);
  }

  // ── Live hover preview ──
  function startLivePreview(canvas, id) {
    stopLivePreview(canvas, id);
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var t = 0;
    var previews = {
      starfield:  drawStarfieldFrame,
      vaporwave:  drawVaporwaveFrame,
      mobius:     drawMobiusFrame,
      tesseract:  drawTesseractFrame,
      abyss:      drawAbyssFrame,
      dunes:      drawDunesFrame
    };
    var fn = previews[id];
    if (!fn) return;

    var interval = 66; // ~15 FPS
    var handle = setInterval(function() {
      t += interval / 1000;
      fn(ctx, w, h, t);
    }, interval);
    activePreview = { canvas: canvas, handle: handle, id: id };
  }

  function stopLivePreview(canvas, id) {
    if (activePreview && activePreview.canvas === canvas) {
      clearInterval(activePreview.handle);
      activePreview = null;
    }
    var ctx = canvas.getContext('2d');
    drawStaticPreview(ctx, id, canvas.width, canvas.height);
  }

  // ═══════════════════════════════════════
  // Mini atmosphere renderers
  // Simplified 2D versions for preview cards
  // ═══════════════════════════════════════

  // ── Starfield ──
  var starfieldStars = null;
  function ensureStarfieldStars(w, h) {
    if (starfieldStars) return starfieldStars;
    starfieldStars = [];
    for (var i = 0; i < 200; i++) {
      starfieldStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 3 + 0.5,
        brightness: Math.random()
      });
    }
    return starfieldStars;
  }

  function drawStarfieldFrame(ctx, w, h, t) {
    var stars = ensureStarfieldStars(w, h);
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);
    stars.forEach(function(s) {
      var pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.brightness * 6));
      var alpha = s.brightness * pulse;
      var hue = s.brightness > 0.7 ? '200, 100%, 80%' : '300, 100%, 70%';
      ctx.fillStyle = s.brightness > 0.5
        ? 'hsla(' + hue + ',' + alpha + ')'
        : 'rgba(200,216,232,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.z, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── Vaporwave ──
  function drawVaporwaveFrame(ctx, w, h, t) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0030');
    grad.addColorStop(0.5, '#2d0060');
    grad.addColorStop(1, '#0a0020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 0, 170, 0.3)';
    ctx.lineWidth = 0.5;
    var horizon = h * 0.55;
    for (var i = 0; i < 12; i++) {
      var y = horizon + (i * i * 1.5) + ((t * 20) % 20);
      if (y > h) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    for (var j = 0; j < 10; j++) {
      var x = (w / 10) * j + (w / 20);
      ctx.beginPath();
      ctx.moveTo(w / 2, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#ff00aa';
    ctx.beginPath();
    ctx.arc(w / 2, horizon - 20, 25, Math.PI, 0);
    ctx.fill();
  }

  // ── Mobius ──
  function drawMobiusFrame(ctx, w, h, t) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    for (var ring = 0; ring < 3; ring++) {
      var r = 30 + ring * 22;
      ctx.beginPath();
      for (var a = 0; a < Math.PI * 2; a += 0.05) {
        var twist = Math.sin(a * 1.5 + t * 1.5 + ring) * 15;
        var px = cx + Math.cos(a) * r + Math.cos(a * 2 + t) * twist;
        var py = cy + Math.sin(a) * r * 0.6 + Math.sin(a * 2 + t) * twist * 0.4;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // ── Tesseract ──
  function drawTesseractFrame(ctx, w, h, t) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var s1 = 35, s2 = 20;
    var a = t * 0.7;

    function project(x, y) {
      var rx = x * Math.cos(a) - y * Math.sin(a);
      var ry = x * Math.sin(a) + y * Math.cos(a);
      return [cx + rx, cy + ry * 0.6];
    }

    var outer = [[-s1,-s1],[s1,-s1],[s1,s1],[-s1,s1]];
    var inner = [[-s2,-s2],[s2,-s2],[s2,s2],[-s2,s2]];

    ctx.strokeStyle = 'rgba(255, 0, 170, 0.5)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    outer.forEach(function(p, i) {
      var pt = project(p[0], p[1]);
      if (i === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
    ctx.closePath();
    ctx.stroke();

    var a2 = a + 0.4;
    function project2(x, y) {
      var rx = x * Math.cos(a2) - y * Math.sin(a2);
      var ry = x * Math.sin(a2) + y * Math.cos(a2);
      return [cx + rx, cy + ry * 0.6];
    }

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.beginPath();
    inner.forEach(function(p, i) {
      var pt = project2(p[0], p[1]);
      if (i === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200, 216, 232, 0.15)';
    for (var i = 0; i < 4; i++) {
      var po = project(outer[i][0], outer[i][1]);
      var pi2 = project2(inner[i][0], inner[i][1]);
      ctx.beginPath();
      ctx.moveTo(po[0], po[1]);
      ctx.lineTo(pi2[0], pi2[1]);
      ctx.stroke();
    }
  }

  // ── Abyss ──
  function drawAbyssFrame(ctx, w, h, t) {
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    for (var i = 6; i >= 0; i--) {
      var r = 15 + i * 12 + Math.sin(t * 0.5 + i * 0.5) * 4;
      var alpha = 0.08 + (6 - i) * 0.03;
      ctx.strokeStyle = 'rgba(0, 240, 255, ' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Dunes ──
  function drawDunesFrame(ctx, w, h, t) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0818');
    grad.addColorStop(1, '#1a1028');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.lineWidth = 0.8;
    for (var layer = 0; layer < 4; layer++) {
      var baseY = h * 0.5 + layer * 18;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 4) {
        var y = baseY
          + Math.sin(x * 0.02 + t * 0.3 + layer * 1.5) * 10
          + Math.sin(x * 0.005 + t * 0.1) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 170, 0, 0.03)';
    for (var k = 0; k < 20; k++) {
      var shimmer = Math.sin(t * 2 + k * 3) * 0.5 + 0.5;
      if (shimmer > 0.8) {
        var sx = (k * 97 + Math.sin(t + k) * 20) % w;
        var sy = h * 0.4 + (k * 37 % (h * 0.5));
        ctx.fillRect(sx, sy, 2, 2);
      }
    }
  }
})();
