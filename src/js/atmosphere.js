// ═══════════════════════════════════════
// ATMOSPHERE LOADER
// Picks a background visualization, persists the choice in a cookie whose
// expiry is inversely proportional to the rarity of the chosen variant,
// and listens for the Konami code as a forced override.
//
// Each visualization registers itself on window.Atmospheres[name] with
// { init(), destroy() }. Modules are loaded as separate scripts.
//
// Accessibility: visitors with prefers-reduced-motion always get the
// starfield (the gentlest variant). The cookie is force-rewritten to match
// on every load so the preference wins over any prior stored value.
//
// Mobile: on touch-primary devices (hover: none and pointer: coarse),
// non-mobile-friendly variants have their weight divided by 10 for the
// weighted pick. Their expiry is unchanged — a mobile visitor who DOES
// land on a heavy variant keeps it as long as anyone else would.
// ═══════════════════════════════════════
(function() {
  const COOKIE_NAME = 'eam_atmo';
  const PICKS_KEY = 'eam_atmo_picks';
  const SEEN_KEY  = 'eam_atmo_seen';
  const TRANSMISSION_KEY = 'eam_atmo_transmission_last';

  const VARIANTS = (window.AtmosphereRegistry || []).map(function(v) {
    return { name: v.id, weight: v.weight, mobileFriendly: v.mobileFriendly, hidden: v.hidden };
  });

  // ── Environment checks ──
  function prefersReducedMotion() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  function isTouchPrimary() {
    try { return matchMedia('(hover: none) and (pointer: coarse)').matches; }
    catch (e) { return false; }
  }

  function effectiveWeight(v) {
    if (isTouchPrimary() && !v.mobileFriendly) return v.weight / 10;
    return v.weight;
  }

  // ── Adaptive weighting ──
  // Decrease probability of frequently-selected atmospheres.
  // Formula: weight / (1 + pickCount * 0.3)
  function getPickCounts() {
    try {
      return JSON.parse(localStorage.getItem(PICKS_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function recordPick(name) {
    try {
      var counts = getPickCounts();
      counts[name] = (counts[name] || 0) + 1;
      localStorage.setItem(PICKS_KEY, JSON.stringify(counts));
    } catch (e) { /* localStorage unavailable */ }
  }

  function adaptiveWeight(v) {
    var w = effectiveWeight(v);
    var counts = getPickCounts();
    var picks = counts[v.name] || 0;
    return w / (1 + picks * 0.3);
  }

  // Linear interpolation between the two anchor points:
  //   weight 80 → 24h  (starfield)
  //   weight 20 → 168h (7 days)
  // Clamped to [24h, 30d].
  function expiryHoursFor(weight) {
    var hours = 216 - 2.4 * weight;
    return Math.max(24, Math.min(720, Math.round(hours)));
  }

  // ── Cookie helpers ──
  function readCookie() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(variantName) {
    var v = VARIANTS.find(function(x) { return x.name === variantName; });
    var hours = v ? expiryHoursFor(v.weight) : 24;
    var exp = new Date(Date.now() + hours * 3600 * 1000).toUTCString();
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(variantName) +
      '; expires=' + exp + '; path=/; SameSite=Lax';
  }
  function clearCookie() {
    document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
  function isValidVariant(name) {
    return VARIANTS.some(function(v) { return v.name === name; });
  }

  // ── Collection tracking ──
  function getSeen() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    } catch (e) { return []; }
  }
  function trackSeen(name) {
    try {
      var seen = getSeen();
      if (seen.indexOf(name) === -1) {
        seen.push(name);
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      }
    } catch (e) { /* localStorage unavailable */ }
  }

  // ── Transmission check ──
  // Returns true if all normal (non-hidden) atmospheres have been seen
  // and the transmission hasn't fired in the last 7 days.
  function shouldShowTransmission() {
    var normalVariants = VARIANTS.filter(function(v) { return !v.hidden; });
    var seen = getSeen();
    var allSeen = normalVariants.every(function(v) {
      return seen.indexOf(v.name) !== -1;
    });
    if (!allSeen) return false;

    try {
      var lastShown = parseInt(localStorage.getItem(TRANSMISSION_KEY) || '0', 10);
      var weekMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastShown < weekMs) return false;
    } catch (e) { /* play it safe — don't show */ return false; }

    return true;
  }

  function markTransmissionShown() {
    try {
      localStorage.setItem(TRANSMISSION_KEY, String(Date.now()));
    } catch (e) { /* no-op */ }
  }

  // ── Random pick (adaptive) ──
  function weightedPick() {
    var eligible = VARIANTS.filter(function(v) { return !v.hidden; });
    var total = eligible.reduce(function(a, v) { return a + adaptiveWeight(v); }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < eligible.length; i++) {
      r -= adaptiveWeight(eligible[i]);
      if (r <= 0) return eligible[i].name;
    }
    return eligible[0].name;
  }

  function getOrPickVariant() {
    if (prefersReducedMotion()) {
      writeCookie('starfield');
      return 'starfield';
    }
    var stored = readCookie();
    if (stored && isValidVariant(stored)) return stored;
    // New selection — record the pick
    var picked = weightedPick();
    writeCookie(picked);
    recordPick(picked);
    return picked;
  }

  // ── Lifecycle ──
  var active = null;

  function freshenCanvas(id) {
    var old = document.getElementById(id);
    if (!old || !old.parentNode) return;
    var fresh = old.cloneNode(false);
    old.parentNode.replaceChild(fresh, old);
  }

  function activate(name) {
    var registry = window.Atmospheres || {};
    var mod = registry[name];
    if (!mod || typeof mod.init !== 'function') {
      console.warn('[atmosphere] module not registered:', name);
      return false;
    }
    if (active && active.module) {
      if (typeof active.module.destroy === 'function') {
        try { active.module.destroy(); } catch (e) { console.warn('[atmosphere] destroy error', e); }
      }
      freshenCanvas('bg');
      freshenCanvas('fx');
    }
    try {
      mod.init();
      active = { name: name, module: mod };
      document.documentElement.setAttribute('data-atmosphere', name);
      trackSeen(name);
      logBanner(name);
      return true;
    } catch (e) {
      console.error('[atmosphere] init error for', name, e);
      return false;
    }
  }

  function randomSwitch() {
    var current = active && active.name;
    var eligible = VARIANTS.filter(function(v) { return !v.hidden; });
    var total = eligible.reduce(function(a, v) {
      var w = adaptiveWeight(v);
      if (v.name === current) w /= 100;
      return a + w;
    }, 0);
    var r = Math.random() * total;
    var picked = eligible[0].name;
    for (var i = 0; i < eligible.length; i++) {
      var w = adaptiveWeight(eligible[i]);
      if (eligible[i].name === current) w /= 100;
      r -= w;
      if (r <= 0) { picked = eligible[i].name; break; }
    }
    writeCookie(picked);
    recordPick(picked);
    activateWhenReady(picked);
  }

  function activateWhenReady(name, attempt) {
    attempt = attempt || 0;
    if (window.Atmospheres && window.Atmospheres[name]) {
      activate(name);
      return;
    }
    if (attempt > 50) {
      console.warn('[atmosphere] giving up waiting for', name);
      var fallback = Object.keys(window.Atmospheres || {})[0];
      if (fallback) activate(fallback);
      return;
    }
    setTimeout(function() { activateWhenReady(name, attempt + 1); }, 20);
  }

  // ── Console banner & rarity reveal ──
  var bannerPrinted = false;
  function rarityLabel(name) {
    var v = VARIANTS.find(function(x) { return x.name === name; });
    if (!v) return name;
    var total = VARIANTS.reduce(function(a, x) { return a + x.weight; }, 0);
    var pct = ((v.weight / total) * 100).toFixed(1);
    return name + ' · ' + pct + '%';
  }
  function logBanner(variant) {
    if (!bannerPrinted) {
      bannerPrinted = true;
      console.log(
        '%c\n' +
        ' ███████╗ █████╗ ███╗   ███╗\n' +
        ' ██╔════╝██╔══██╗████╗ ████║\n' +
        ' █████╗  ███████║██╔████╔██║\n' +
        ' ██╔══╝  ██╔══██║██║╚██╔╝██║\n' +
        ' ███████╗██║  ██║██║ ╚═╝ ██║\n' +
        ' ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝\n',
        'color: #00f0ff; font-family: monospace; font-weight: bold; line-height: 1;'
      );
      console.log(
        '%cYou opened the console. I like you already.',
        'color: #ff00aa; font-size: 14px;'
      );
      console.log(
        '%cWant to build something together? → linkedin.com/in/ericallenmann',
        'color: #c8d8e8; font-size: 12px;'
      );
      console.log(
        '%cThe starfield has siblings. Try ↑↑↓↓←→←→ B A Enter to shuffle. Atmosphere.list() for names.',
        'color: #8899aa; font-size: 11px; font-style: italic;'
      );
      console.log(
        '%c// atmosphere index: /atmosphere/',
        'color: #00f0ff55; font-size: 10px;'
      );
    }
    console.log(
      '%c// atmosphere: ' + rarityLabel(variant),
      'color: #8899aa; font-size: 11px; font-style: italic;'
    );
  }

  // ── Konami code ──
  //   ↑↑↓↓←→←→ B A Enter → weighted random shuffle (current variant ÷100)
  var KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a', 'Enter',
  ];
  var buffer = [];
  function onKey(e) {
    var key = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
    buffer.push(key);
    if (buffer.length > KONAMI.length) {
      buffer = buffer.slice(-KONAMI.length);
    }
    if (buffer.length < KONAMI.length) return;
    for (var i = 0; i < KONAMI.length; i++) {
      if (buffer[i] !== KONAMI[i]) return;
    }
    buffer = [];
    randomSwitch();
  }
  document.addEventListener('keydown', onKey);

  // Debug API. Transmission is excluded from normal rotation.
  window.Atmosphere = {
    list: function() { return VARIANTS.filter(function(v) { return !v.hidden; }).map(function(v) { return v.name; }); },
    listAll: function() { return VARIANTS.map(function(v) { return v.name; }); },
    current: function() { return active && active.name; },
    set: function(name) {
      if (!isValidVariant(name)) return false;
      writeCookie(name);
      recordPick(name);
      activateWhenReady(name);
      return true;
    },
    next: function() { randomSwitch(); },
    clear: clearCookie,
    // Temporary debug: force-play the transmission sequence.
    // Remove before final ship.
    transmission: function() {
      var current = active && active.name;
      activateWhenReady('transmission', 0, current || 'starfield');
    },
  };

  // ── Boot ──
  function boot() {
    var chosen = getOrPickVariant();

    if (shouldShowTransmission()) {
      markTransmissionShown();
      activateWhenReady('transmission', 0, chosen);
    } else {
      activateWhenReady(chosen);
    }
  }

  // Overload activateWhenReady to support a follow-up atmosphere for transmission
  var _origActivateWhenReady = activateWhenReady;
  activateWhenReady = function(name, attempt, followUp) {
    attempt = attempt || 0;
    if (name === 'transmission') {
      var registry = window.Atmospheres || {};
      if (registry.transmission) {
        var transmod = registry.transmission;
        if (active && active.module) {
          if (typeof active.module.destroy === 'function') {
            try { active.module.destroy(); } catch (e) {}
          }
          freshenCanvas('bg');
          freshenCanvas('fx');
        }
        transmod.init({
          onComplete: function() {
            if (typeof transmod.destroy === 'function') {
              try { transmod.destroy(); } catch (e) {}
            }
            freshenCanvas('bg');
            freshenCanvas('fx');
            if (followUp) {
              _origActivateWhenReady(followUp);
            }
          }
        });
        active = { name: 'transmission', module: transmod };
        document.documentElement.setAttribute('data-atmosphere', 'transmission');
        trackSeen('transmission');
        return;
      }
      if (attempt > 50) {
        if (followUp) _origActivateWhenReady(followUp);
        return;
      }
      setTimeout(function() { activateWhenReady(name, attempt + 1, followUp); }, 20);
      return;
    }
    _origActivateWhenReady(name, attempt);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// ═══════════════════════════════════════
// SCROLL REVEAL (shared, runs regardless of background)
// ═══════════════════════════════════════
(function() {
  var reveals = document.querySelectorAll('.reveal');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  reveals.forEach(function(el) { observer.observe(el); });
})();
