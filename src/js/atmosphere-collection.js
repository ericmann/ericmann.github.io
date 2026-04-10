(function() {
  var grid = document.getElementById('atmo-grid');
  if (!grid) return;

  var ATMOSPHERES = window.AtmosphereRegistry || [];
  if (!ATMOSPHERES.length) return;

  var RARITY_LABELS = {
    'default':  'DEFAULT',
    'uncommon': 'UNCOMMON',
    'rare':     'RARE',
    'exotic':   'EXOTIC'
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
  var totalEl = document.getElementById('atmo-total');
  if (totalEl) totalEl.textContent = ATMOSPHERES.length;

  ATMOSPHERES.forEach(function(atmo) {
    var isSeen = seen.indexOf(atmo.id) !== -1;
    var pct = totalWeight > 0 ? Math.round((atmo.weight / totalWeight) * 100) : 0;
    var card = document.createElement('div');
    card.className = 'atmo-card' + (isSeen ? '' : ' locked');
    if (isSeen) {
      card.style.cursor = 'pointer';
      card.title = 'Switch to ' + atmo.name;
      card.addEventListener('click', (function(id) {
        return function() {
          if (window.Atmosphere && window.Atmosphere.set) {
            window.Atmosphere.set(id);
          }
        };
      })(atmo.id));
    }

    var img = document.createElement('img');
    img.className = 'atmo-preview';
    img.src = '/images/atmo/' + atmo.id + '.png';
    img.alt = isSeen ? atmo.name + ' atmosphere' : 'Undetected atmosphere';
    img.loading = 'lazy';
    img.width = 1280;
    img.height = 720;
    card.appendChild(img);

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
    grid.appendChild(card);
  });
})();
