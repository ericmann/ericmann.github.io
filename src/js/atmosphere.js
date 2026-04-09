// ═══════════════════════════════════════
// ATMOSPHERE LOADER
// Picks a background visualization, persists the choice for 24h,
// and listens for the Konami code as a forced override.
//
// Each visualization registers itself on window.Atmospheres[name]
// with { init(), destroy() }. Modules are loaded as separate scripts.
// ═══════════════════════════════════════
(function() {
  const COOKIE_NAME = 'eam_atmo';
  const COOKIE_HOURS = 24;

  // Order matters: index+1 maps to the Konami digit (1..6).
  const VARIANTS = [
    { name: 'starfield',  weight: 90   },
    { name: 'vaporwave',  weight: 5    },
    { name: 'mobius',     weight: 3    },
    { name: 'tesseract',  weight: 1.5  },
    { name: 'abyss',      weight: 0.25 },
    { name: 'dunes',      weight: 0.25 },
  ];

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, hours) {
    const exp = new Date(Date.now() + hours * 3600 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax';
  }

  function weightedPick() {
    const total = VARIANTS.reduce((a, v) => a + v.weight, 0);
    let r = Math.random() * total;
    for (const v of VARIANTS) {
      r -= v.weight;
      if (r <= 0) return v.name;
    }
    return VARIANTS[0].name;
  }

  function isValidVariant(name) {
    return VARIANTS.some(v => v.name === name);
  }

  function getOrPickVariant() {
    const stored = readCookie(COOKIE_NAME);
    if (stored && isValidVariant(stored)) return stored;
    const picked = weightedPick();
    writeCookie(COOKIE_NAME, picked, COOKIE_HOURS);
    return picked;
  }

  // ── Lifecycle ──
  let active = null; // { name, module }

  // Replace a canvas with a clone of itself. A canvas can only ever own one
  // rendering context (2d OR webgl), and once lost it can't be re-acquired
  // cleanly — so on swap we simply hand the next module a fresh DOM node.
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
      // Only freshen canvases when swapping — on first activation the
      // canvases are already pristine and pre-acquiring a context here
      // would leave Three.js with a half-initialized one.
      freshenCanvas('bg');
      freshenCanvas('fx');
    }

    try {
      mod.init();
      active = { name, module: mod };
      document.documentElement.setAttribute('data-atmosphere', name);
      logBanner(name);
      return true;
    } catch (e) {
      console.error('[atmosphere] init error for', name, e);
      return false;
    }
  }

  // ── Console banner & rarity reveal ──
  let bannerPrinted = false;
  const RARITY_LABELS = {
    starfield: 'starfield · default · 90%',
    vaporwave: 'vaporwave · uncommon · 5%',
    mobius:    'mobius · rare · 3%',
    tesseract: 'tesseract · very rare · 1.5%',
    abyss:     'abyss · super rare · 0.25%',
    dunes:     'dunes · super rare · 0.25%',
  };
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
        '%cWant to build something together? → linkedin.com/in/shortericmann',
        'color: #c8d8e8; font-size: 12px;'
      );
      console.log(
        '%cThe starfield has siblings. Try ↑↑↓↓←→←→ B A 1-6, or call Atmosphere.list().',
        'color: #8899aa; font-size: 11px; font-style: italic;'
      );
    }
    const label = RARITY_LABELS[variant] || variant;
    console.log(
      '%c// atmosphere: ' + label,
      'color: #8899aa; font-size: 11px; font-style: italic;'
    );
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
      // Fall back to whatever is registered.
      const fallback = Object.keys(window.Atmospheres || {})[0];
      if (fallback) activate(fallback);
      return;
    }
    setTimeout(() => activateWhenReady(name, attempt + 1), 20);
  }

  // ── Konami code: ↑↑↓↓←→←→ B A [1-5] ──
  const KONAMI_PREFIX = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ];
  let buffer = [];
  function onKey(e) {
    const key = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
    buffer.push(key);
    if (buffer.length > KONAMI_PREFIX.length + 1) {
      buffer = buffer.slice(-(KONAMI_PREFIX.length + 1));
    }
    if (buffer.length < KONAMI_PREFIX.length + 1) return;
    for (let i = 0; i < KONAMI_PREFIX.length; i++) {
      if (buffer[i] !== KONAMI_PREFIX[i]) return;
    }
    const digit = buffer[KONAMI_PREFIX.length];
    const idx = parseInt(digit, 10) - 1;
    if (idx >= 0 && idx < VARIANTS.length) {
      const target = VARIANTS[idx].name;
      writeCookie(COOKIE_NAME, target, COOKIE_HOURS);
      activateWhenReady(target);
      buffer = [];
    }
  }
  document.addEventListener('keydown', onKey);

  // Expose a tiny debug API.
  window.Atmosphere = {
    list: () => VARIANTS.map(v => v.name),
    current: () => active && active.name,
    set: (name) => {
      if (!isValidVariant(name)) return false;
      writeCookie(COOKIE_NAME, name, COOKIE_HOURS);
      activateWhenReady(name);
      return true;
    },
    clear: () => { document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; },
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
