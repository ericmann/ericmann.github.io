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
  { id: 'starfield',      name: 'Starfield',       weight: 200,  rarity: 'default',  mobileFriendly: true  },
  { id: 'vaporwave',      name: 'Vaporwave',       weight: 10,  rarity: 'uncommon', mobileFriendly: true  },
  { id: 'constellation',  name: 'Constellation',   weight: 10,  rarity: 'uncommon', mobileFriendly: true  },
  { id: 'mobius',         name: 'Möbius',          weight: 4,   rarity: 'rare',     mobileFriendly: true  },
  { id: 'tesseract',      name: 'Tesseract',       weight: 4,   rarity: 'rare',     mobileFriendly: true  },
  { id: 'rain',           name: 'Rain',            weight: 4,   rarity: 'rare',     mobileFriendly: true  },
  { id: 'forge',          name: 'Forge',           weight: 4,   rarity: 'rare',     mobileFriendly: false },
  { id: 'abyss',          name: 'Abyss',           weight: 4,   rarity: 'exotic',   mobileFriendly: false },
  { id: 'dunes',          name: 'Dunes',           weight: 4,   rarity: 'exotic',   mobileFriendly: false },
  { id: 'fireflies',      name: 'Fireflies',       weight: 2,   rarity: 'exotic',   mobileFriendly: true  },
  { id: 'sonar',          name: 'Sonar',           weight: 2,   rarity: 'exotic',   mobileFriendly: false },
  { id: 'roots',          name: 'Roots',           weight: 2,   rarity: 'exotic',   mobileFriendly: true  },
  { id: 'aurora',         name: 'Aurora',          weight: 2,   rarity: 'exotic',   mobileFriendly: false },
  { id: 'fractal',        name: 'Fractal',         weight: 1,   rarity: 'exotic',   mobileFriendly: true  },
  { id: 'kinetic',        name: 'Kinetic',         weight: 10,  rarity: 'uncommon', mobileFriendly: true  },
];
