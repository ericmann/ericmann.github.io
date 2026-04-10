// ═══════════════════════════════════════
// SONAR — exotic
// Military submarine sonar display. A ping ring expands from center every
// ~4 seconds, illuminating scattered contacts and polygonal structures as
// it sweeps past. A faint radar arm rotates continuously. Click to ping.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  var canvas, ctx, raf = 0;
  var resizeHandler, clickHandler;
  var W = 0, H = 0, dpr = 1;
  var isPreview = false;
  var contacts = [];
  var structures = [];
  var pings = [];
  var lastTime = 0;
  var sweepAngle = 0;

  var BG_COLOR       = '#050510';
  var DIM_COLOR      = '#0a4020';
  var ACTIVE_COLOR   = '#39ff7a';
  var PING_SPEED     = 200;
  var PING_INTERVAL  = 4000;
  var FADE_DURATION  = 3000;
  var SWEEP_PERIOD   = 6000;

  var lastAutoPing = 0;

  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  function irregularPoly(cx, cy, r, sides) {
    var pts = [];
    for (var i = 0; i < sides; i++) {
      var a = (Math.PI * 2 / sides) * i + (Math.random() - 0.5) * 0.4;
      var rr = r * (0.6 + Math.random() * 0.6);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    return pts;
  }

  function sampleEdges(vertices, spacing) {
    var points = [];
    for (var i = 0; i < vertices.length; i++) {
      var a = vertices[i];
      var b = vertices[(i + 1) % vertices.length];
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.hypot(dx, dy);
      var steps = Math.max(1, Math.floor(len / spacing));
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        points.push({
          x: a.x + dx * t,
          y: a.y + dy * t,
          lastIlluminatedAt: -99999
        });
      }
    }
    return points;
  }

  function generateGeometry() {
    contacts = [];
    structures = [];

    var contactCount = isPreview ? 15 : 40;
    for (var i = 0; i < contactCount; i++) {
      contacts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        lastIlluminatedAt: -99999
      });
    }

    var structCount = isPreview ? 2 : 6;
    var margin = Math.min(W, H) * 0.1;
    for (var s = 0; s < structCount; s++) {
      var cx = margin + Math.random() * (W - margin * 2);
      var cy = margin + Math.random() * (H - margin * 2);
      var r = 20 + Math.random() * 40;
      var kind = Math.random();
      var verts;
      if (kind < 0.33) {
        var hw = r * (0.8 + Math.random() * 0.8);
        var hh = r * (0.5 + Math.random() * 0.5);
        verts = [
          { x: cx - hw, y: cy - hh },
          { x: cx + hw, y: cy - hh },
          { x: cx + hw, y: cy + hh },
          { x: cx - hw, y: cy + hh }
        ];
      } else if (kind < 0.66) {
        verts = hexPoints(cx, cy, r);
      } else {
        verts = irregularPoly(cx, cy, r, 5 + Math.floor(Math.random() * 3));
      }
      structures.push({
        vertices: verts,
        points: sampleEdges(verts, 8)
      });
    }
  }

  function emitPing(x, y, time) {
    pings.push({ x: x, y: y, born: time, radius: 0 });
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
      generateGeometry();
    }
    applySize();

    if (!isPreview) {
      resizeHandler = function() { applySize(); };
      window.addEventListener('resize', resizeHandler);

      clickHandler = function(e) {
        emitPing(e.clientX, e.clientY, performance.now());
      };
      document.addEventListener('click', clickHandler);
    }

    lastTime = performance.now();
    lastAutoPing = lastTime;
    emitPing(W / 2, H / 2, lastTime);
    raf = requestAnimationFrame(frame);
  }

  function illuminatePoint(pt, pingX, pingY, ringRadius, now) {
    var dist = Math.hypot(pt.x - pingX, pt.y - pingY);
    var ringWidth = 30;
    if (Math.abs(dist - ringRadius) < ringWidth) {
      pt.lastIlluminatedAt = now;
    }
  }

  function pointAlpha(pt, now) {
    var elapsed = now - pt.lastIlluminatedAt;
    if (elapsed > FADE_DURATION) return 0;
    return 1 - elapsed / FADE_DURATION;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (now - lastAutoPing > PING_INTERVAL) {
      emitPing(W / 2, H / 2, now);
      lastAutoPing = now;
    }

    sweepAngle += (Math.PI * 2 / SWEEP_PERIOD) * (now - (now - dt * 1000));

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    var maxPingRadius = Math.hypot(W, H);

    for (var p = pings.length - 1; p >= 0; p--) {
      var ping = pings[p];
      ping.radius += PING_SPEED * dt;

      if (ping.radius > maxPingRadius) {
        pings.splice(p, 1);
        continue;
      }

      for (var c = 0; c < contacts.length; c++) {
        illuminatePoint(contacts[c], ping.x, ping.y, ping.radius, now);
      }
      for (var s = 0; s < structures.length; s++) {
        var pts = structures[s].points;
        for (var sp = 0; sp < pts.length; sp++) {
          illuminatePoint(pts[sp], ping.x, ping.y, ping.radius, now);
        }
      }

      var ringAlpha = Math.max(0, 0.5 * (1 - ping.radius / maxPingRadius));
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, ping.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(57, 255, 122, ' + ringAlpha + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawSweepArm(now);

    for (var i = 0; i < contacts.length; i++) {
      var a = pointAlpha(contacts[i], now);
      if (a > 0) {
        ctx.fillStyle = 'rgba(57, 255, 122, ' + a + ')';
        ctx.beginPath();
        ctx.arc(contacts[i].x, contacts[i].y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = DIM_COLOR;
        ctx.beginPath();
        ctx.arc(contacts[i].x, contacts[i].y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (var si = 0; si < structures.length; si++) {
      var struct = structures[si];

      ctx.beginPath();
      ctx.moveTo(struct.vertices[0].x, struct.vertices[0].y);
      for (var v = 1; v < struct.vertices.length; v++) {
        ctx.lineTo(struct.vertices[v].x, struct.vertices[v].y);
      }
      ctx.closePath();
      ctx.strokeStyle = DIM_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();

      for (var pi = 0; pi < struct.points.length; pi++) {
        var sa = pointAlpha(struct.points[pi], now);
        if (sa > 0) {
          ctx.fillStyle = 'rgba(57, 255, 122, ' + sa + ')';
          ctx.beginPath();
          ctx.arc(struct.points[pi].x, struct.points[pi].y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawCrosshair(now);
    drawRangeRings();
  }

  function drawSweepArm(now) {
    sweepAngle = ((now % SWEEP_PERIOD) / SWEEP_PERIOD) * Math.PI * 2;
    var cx = W / 2;
    var cy = H / 2;
    var reach = Math.hypot(W, H) / 2;

    var trailSpan = 0.35;
    var steps = 40;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var angle = sweepAngle - trailSpan * t;
      var alpha = 0.12 * (1 - t);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
      ctx.strokeStyle = 'rgba(57, 255, 122, ' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * reach, cy + Math.sin(sweepAngle) * reach);
    ctx.strokeStyle = 'rgba(57, 255, 122, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawCrosshair() {
    var cx = W / 2;
    var cy = H / 2;
    ctx.strokeStyle = 'rgba(57, 255, 122, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
  }

  function drawRangeRings() {
    var cx = W / 2;
    var cy = H / 2;
    var maxR = Math.min(W, H) / 2;
    ctx.strokeStyle = 'rgba(57, 255, 122, 0.06)';
    ctx.lineWidth = 1;
    var ringCount = 4;
    for (var r = 1; r <= ringCount; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * r / ringCount, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (clickHandler) document.removeEventListener('click', clickHandler);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    contacts = [];
    structures = [];
    pings = [];
    canvas = ctx = null;
    resizeHandler = clickHandler = null;
    sweepAngle = 0;
    lastAutoPing = 0;
    isPreview = false;
  }

  window.Atmospheres.sonar = { init: init, destroy: destroy };
})();
