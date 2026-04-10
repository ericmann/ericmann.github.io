// ═══════════════════════════════════════
// ATMOSPHERE REGISTRY — single source of truth
// Canonical variant list shared by atmosphere.js (loader),
// bg-*.js modules (renderers), and atmosphere-collection.js (gallery).
//
// Fields:
//   id             — module key in window.Atmospheres
//   name           — display name
//   weight         — used for weighted random pick AND cookie expiry
//   rarity         — display tier: 'default', 'rare', 'exotic'
//   mobileFriendly — false = weight ÷ 10 on touch-primary devices
// ═══════════════════════════════════════
window.AtmosphereRegistry = [
  { id: 'starfield',  name: 'Starfield',  weight: 80, rarity: 'default', mobileFriendly: true  },
  { id: 'vaporwave',  name: 'Vaporwave',  weight: 4,  rarity: 'rare',    mobileFriendly: true  },
  { id: 'mobius',     name: 'Möbius',      weight: 4,  rarity: 'rare',    mobileFriendly: true  },
  { id: 'tesseract',  name: 'Tesseract',   weight: 4,  rarity: 'rare',    mobileFriendly: true  },
  { id: 'abyss',      name: 'Abyss',       weight: 4,  rarity: 'exotic',  mobileFriendly: false },
  { id: 'dunes',      name: 'Dunes',       weight: 4,  rarity: 'exotic',  mobileFriendly: false },
];
