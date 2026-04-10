(function() {
  var grid = document.getElementById('atmo-grid');
  if (!grid) return;

  var ATMOSPHERES = window.AtmosphereRegistry || [];
  if (!ATMOSPHERES.length) return;

  var RARITY_LABELS = {
    'default': 'DEFAULT',
    'rare':    'RARE',
    'exotic':  'EXOTIC'
  };

  var totalWeight = ATMOSPHERES.reduce(function(sum, v) { return sum + v.weight; }, 0);

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
    var pct = totalWeight > 0 ? Math.round((atmo.weight / totalWeight) * 100) : 0;
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

    var info = document.createElement('div');
    info.className = 'atmo-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'atmo-name';
    nameEl.textContent = isSeen ? atmo.name : '???';
    info.appendChild(nameEl);

    var rarityEl = document.createElement('div');
    rarityEl.className = 'atmo-rarity ' + atmo.rarity;
    rarityEl.textContent = isSeen
      ? (RARITY_LABELS[atmo.rarity] || atmo.rarity.toUpperCase()) + ' — ' + pct + '%'
      : '??? — ?%';
    info.appendChild(rarityEl);

    var statusEl = document.createElement('div');
    statusEl.className = 'atmo-status' + (isSeen ? ' detected' : '');
    statusEl.textContent = isSeen ? 'DETECTED' : 'UNDETECTED';
    info.appendChild(statusEl);

    card.appendChild(info);

    if (isSeen) {
      card.addEventListener('mouseenter', function() {
        startPreview(canvas, atmo.id);
      });
      card.addEventListener('mouseleave', function() {
        stopPreview(canvas, atmo.id);
      });
    }

    grid.appendChild(card);
  });

  function startPreview(canvas, id) {
    stopActivePreview();

    var mod = window.Atmospheres && window.Atmospheres[id];
    if (!mod || typeof mod.init !== 'function') return;

    mod.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      preview: true
    });

    activePreview = { id: id, canvas: canvas };
  }

  function stopPreview(canvas, id) {
    if (activePreview && activePreview.canvas === canvas) {
      stopActivePreview();
    }
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function stopActivePreview() {
    if (!activePreview) return;
    var mod = window.Atmospheres && window.Atmospheres[activePreview.id];
    if (mod && typeof mod.destroy === 'function') {
      try { mod.destroy(); } catch (e) { /* ignore */ }
    }
    activePreview = null;
  }
})();
