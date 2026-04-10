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

  // Read from the shared registry (atmosphere-registry.js).
  // Map 'id' to 'name' for backward compat with the rest of this file.
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

  // Touch devices get the non-mobile-friendly variants at 1/10 weight.
  function effectiveWeight(v) {
    if (isTouchPrimary() && !v.mobileFriendly) return v.weight / 10;
    return v.weight;
  }

  // Linear interpolation between the two anchor points the user specified:
  //   weight 80 → 24h  (starfield)
  //   weight 20 → 168h (7 days)
  // Extrapolates smoothly for other weights, clamped to [24h, 30d].
  // Rare variants stick longer so curious visitors can appreciate them.
  function expiryHoursFor(weight) {
    const hours = 216 - 2.4 * weight;
    return Math.max(24, Math.min(720, Math.round(hours)));
  }

  // ── Cookie helpers ──
  function readCookie() {
    const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(variantName) {
    const v = VARIANTS.find(x => x.name === variantName);
    // Expiry uses the *canonical* weight; mobile adjustments don't affect it.
    const hours = v ? expiryHoursFor(v.weight) : 24;
    const exp = new Date(Date.now() + hours * 3600 * 1000).toUTCString();
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(variantName) +
      '; expires=' + exp + '; path=/; SameSite=Lax';
  }
  function clearCookie() {
    document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
  function isValidVariant(name) {
    return VARIANTS.some(v => v.name === name);
  }

  // ── Collection tracking ──
  function trackSeen(name) {
    try {
      var seen = JSON.parse(localStorage.getItem('eam_atmo_seen') || '[]');
      if (seen.indexOf(name) === -1) {
        seen.push(name);
        localStorage.setItem('eam_atmo_seen', JSON.stringify(seen));
      }
    } catch (e) { /* localStorage unavailable */ }
  }

  // ── Random pick ──
  function weightedPick() {
    const eligible = VARIANTS.filter(v => !v.hidden);
    const total = eligible.reduce((a, v) => a + effectiveWeight(v), 0);
    let r = Math.random() * total;
    for (const v of eligible) {
      r -= effectiveWeight(v);
      if (r <= 0) return v.name;
    }
    return eligible[0].name;
  }

  function getOrPickVariant() {
    // Accessibility: reduced-motion visitors always get the starfield.
    // We force-rewrite the cookie so a prior stored choice can't bypass it.
    if (prefersReducedMotion()) {
      writeCookie('starfield');
      return 'starfield';
    }
    const stored = readCookie();
    if (stored && isValidVariant(stored)) return stored;
    const picked = weightedPick();
    writeCookie(picked);
    return picked;
  }

  // ── Lifecycle ──
  let active = null; // { name, module }

  // A canvas can only ever own one rendering context (2d OR webgl), and
  // once lost it can't be re-acquired cleanly — so on swap we simply hand
  // the next module a fresh DOM node.
  function freshenCanvas(id) {
    const old = document.getElementById(id);
    if (!old || !old.parentNode) return;
    const fresh = old.cloneNode(false);
    old.parentNode.replaceChild(fresh, old);
  }

  function activate(name) {
    const registry = window.Atmospheres || {};
    const mod = registry[name];
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
      active = { name, module: mod };
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
    const current = active && active.name;
    const eligible = VARIANTS.filter(v => !v.hidden);
    const total = eligible.reduce(function(a, v) {
      var w = effectiveWeight(v);
      if (v.name === current) w /= 100;
      return a + w;
    }, 0);
    var r = Math.random() * total;
    var picked = eligible[0].name;
    for (var i = 0; i < eligible.length; i++) {
      var w = effectiveWeight(eligible[i]);
      if (eligible[i].name === current) w /= 100;
      r -= w;
      if (r <= 0) { picked = eligible[i].name; break; }
    }
    writeCookie(picked);
    activateWhenReady(picked);
  }

  // Wait until the chosen module has registered before activating it.
  function activateWhenReady(name, attempt) {
    attempt = attempt || 0;
    if (window.Atmospheres && window.Atmospheres[name]) {
      activate(name);
      return;
    }
    if (attempt > 50) {
      console.warn('[atmosphere] giving up waiting for', name);
      const fallback = Object.keys(window.Atmospheres || {})[0];
      if (fallback) activate(fallback);
      return;
    }
    setTimeout(() => activateWhenReady(name, attempt + 1), 20);
  }

  // ── Console banner & rarity reveal ──
  let bannerPrinted = false;
  function rarityLabel(name) {
    const v = VARIANTS.find(x => x.name === name);
    if (!v) return name;
    const total = VARIANTS.reduce((a, x) => a + x.weight, 0);
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
  const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a', 'Enter',
  ];
  let buffer = [];
  function onKey(e) {
    const key = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
    buffer.push(key);
    if (buffer.length > KONAMI.length) {
      buffer = buffer.slice(-KONAMI.length);
    }
    if (buffer.length < KONAMI.length) return;
    for (let i = 0; i < KONAMI.length; i++) {
      if (buffer[i] !== KONAMI[i]) return;
    }
    buffer = [];
    randomSwitch();
  }
  document.addEventListener('keydown', onKey);

  // Debug API.
  window.Atmosphere = {
    list: () => VARIANTS.filter(v => !v.hidden).map(v => v.name),
    listAll: () => VARIANTS.map(v => v.name),
    current: () => active && active.name,
    set: (name) => {
      if (!isValidVariant(name)) return false;
      writeCookie(name);
      activateWhenReady(name);
      return true;
    },
    next: () => randomSwitch(),
    clear: clearCookie,
  };

  // Boot.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => activateWhenReady(getOrPickVariant()));
  } else {
    activateWhenReady(getOrPickVariant());
  }
})();

// ═══════════════════════════════════════
// SCROLL REVEAL (shared, runs regardless of background)
// ═══════════════════════════════════════
(function() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
})();
