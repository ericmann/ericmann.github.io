# Future Atmospheres — Working Notes

Backlog of atmosphere ideas to iterate on later. This file is intentionally
**local-only** (not committed). When an idea graduates to implementation,
spin it into a real `bg-<name>.js` module on a feature branch.

## Current state of the registry

Source of truth: `src/js/atmosphere-registry.js`

```
starfield  · default   · weight 80  · mobile ✓
vaporwave  · uncommon  · weight 40  · mobile ✓  (bumped from 4)
mobius     · rare      · weight 4   · mobile ✓
tesseract  · rare      · weight 4   · mobile ✓
abyss      · exotic    · weight 4   · mobile ✗ (÷10 on touch devices)
dunes      · exotic    · weight 4   · mobile ✗ (÷10 on touch devices)
```

Rarity display tiers: `default`, `uncommon`, `rare`, `exotic`. These
are purely cosmetic labels shown on the `/atmosphere/` collection page.
The actual probability is determined by the weight system below.

### How weights work

Weights are **relative**, not percentages. The probability of any variant
being selected is `weight / totalWeight`. This means adding a new variant
doesn't require recalculating existing weights — the system self-adjusts.

**Current total weight: 100**

| Variant    | Weight | Probability         |
|------------|--------|---------------------|
| starfield  | 80     | 80/100 = **80.0%**  |
| vaporwave  | 4      | 4/100 = **4.0%**    |
| mobius     | 4      | 4/100 = **4.0%**    |
| tesseract  | 4      | 4/100 = **4.0%**    |
| abyss      | 4      | 4/100 = **4.0%**    |
| dunes      | 4      | 4/100 = **4.0%**    |

**Example: adding a new variant with weight 2**

Total becomes 102. Starfield drops from 80.0% to 78.4%. Each weight-4
variant drops from 4.0% to 3.9%. The new variant appears 2.0% of the time.
No existing weights need to change.

**Example: adding a second "common" variant with weight 80**

Total becomes 180. Both starfield and the new one each appear 80/180 =
44.4%. Rare variants each drop to 4/180 = 2.2%. Again, no existing weights
need to change — just add the entry and the math adjusts.

**Rule of thumb for choosing weights:**
- 80 = co-default (will share ~equal probability with starfield)
- 20–40 = uncommon (shows up noticeably often)
- 4–8 = rare (current rare/exotic tier)
- 1–2 = very rare (special occasions)
- 0.5 = legendary (someone will eventually hit it)

The cookie expiry also scales with weight (lower weight = longer expiry)
so rare variants stick around when they do appear.

On mobile (touch-primary devices), variants with `mobileFriendly: false`
have their effective weight divided by 10 for the pick, making them 10×
rarer on phones/tablets.

The Konami digit pool maps to array index + 1. New variants get the next
free digit automatically.

---

## Tier: Uncommon (suggested weight: 40)

### Constellation
Stars are stationary, but as the user scrolls, faint lines slowly draw
between them forming constellations — except the constellations are
circuit-board traces, slowly revealing a PCB layout across the whole
viewport. Cyan traces, amber solder points at the nodes. The further you
scroll, the more of the board is revealed. Scroll back up and they fade.

**Suggested weight: 40**

**Implementation notes:**
- Pure 2D canvas on `#bg`. No WebGL needed.
- Pre-generate the PCB graph at init: ~80 nodes (solder points) and ~120
  edges (traces). Use a Voronoi or Poisson-disk distribution so nodes
  feel naturally placed, not gridded.
- Each edge has an `unlocked: bool` and a `progress: 0..1` field.
- Listen for `scroll` events. Map scroll progress (`window.scrollY /
  document.body.scrollHeight`) to the number of edges that should be
  unlocked. Easing the unlock so adjacent edges activate first looks more
  organic than a hard threshold.
- Each frame, animate `progress` toward target (1 if unlocked, 0 if not).
- Render: stars/nodes always visible (low opacity dots), traces drawn as
  partial line segments with `progress` controlling how far they extend
  from the starting node.
- Solder points pulse amber briefly when their incident edges complete.

**Gotchas:**
- Scroll direction handling — the obvious "scroll up = fade" can feel
  punishing if someone scrolls down then back up to read. Consider
  *peak scroll*: edges unlock at max scroll depth and stay unlocked
  until the page is reloaded.
- Trace routing should look PCB-like (Manhattan with 45° diagonals)
  rather than straight lines between random points. A simple A* on a
  grid with cost penalties for diagonals would do it.
- Solder pads need to be on grid intersections for the 45° look to read.
- `mobileFriendly: true` — scroll-driven, no cursor dependency.

**Complexity:** medium. ~250 lines. Visual quality depends entirely on
how natural the trace routing looks.

---

## Tier: Rare (suggested weight: 4)

### Rain
Top-down view of a dark water surface. Raindrops land at random positions
creating expanding concentric ripple rings that interfere with each other
(additive wave simulation). Mouse position creates a sustained
disturbance — a finger dragging through still water. Monochrome
blue-white, very quiet.

**Suggested weight: 4**

**Implementation notes:**
- 2D canvas on `#bg`. WebGL would be more performant but adds complexity.
- Two approaches:
  - **Cheap (recommended)**: each raindrop spawns a Ripple object with
    `(x, y, age, maxRadius)`. Render each ripple as a thin circle stroke
    with alpha proportional to `1 - age/lifetime` and radius growing with
    age. Multiple ripples on screen visually overlap but don't actually
    interfere mathematically — looks "good enough" for monochrome.
  - **Real**: an actual 2D wave simulation on a grid (cellular wave
    propagation). Each cell has `height` and `velocity`; each tick
    `velocity += (avgNeighborHeight - height) * c`, then
    `height += velocity * dt`. Render the heightmap as alpha intensity.
    More expensive (typically 256×144 grid) but produces real
    interference patterns and realistic ripple physics.
- Mouse drag = continuously inject a small disturbance at the cursor
  position (one wave-grid cell per frame, or one ripple every few frames).
- Color: use `--text-bright` (#eef4ff) tinted slightly cyan, on a near-
  black background.
- `mobileFriendly: true` (cheap approach) or `false` (real wave sim).

**Gotchas:**
- The cellular approach needs careful tuning of damping or it explodes.
  Start with `velocity *= 0.998` per tick and `wave_speed = 0.18`.
- A 256-wide grid is borderline on mobile. Need to scale down on small
  viewports or fall back to the cheap approach.
- Ripples should fade *long* before they reach the edges, otherwise the
  edge clipping reads as artificial.

**Complexity:** cheap version is small (~150 lines). Real version is
medium (~300 lines + careful tuning).

---

### Forge
Glowing embers drift upward from the bottom of the viewport. Occasionally
a brighter particle streaks up and bursts into a shower of sparks. The
whole thing has a deep orange-to-black gradient feel, like looking up
from inside a blacksmith's forge. Mouse movement fans the embers —
moving left pushes them right, like breath on coals.

**Suggested weight: 4**

**Implementation notes:**
- 2D canvas on `#bg`. Additive blending.
- Two particle types:
  - **Embers** (~150): slow upward drift (~30 px/s), small horizontal
    drift, lifetime ~6s, fade in then out. Color: amber with brightness
    flicker via per-particle sin phase.
  - **Spark bursts**: a "rocket" particle that streaks upward fast
    (~250 px/s), then at a random altitude explodes into 8–15 sparklets
    that scatter and decay quickly (lifetime ~0.6s). One rocket every
    ~2–4 seconds.
- Mouse interaction: track mouse velocity. Add a horizontal bias to all
  embers within a radius of the cursor, opposite to the cursor's motion
  direction (cursor moves left → embers blow right, like wind from a
  bellows or breath).
- Background: a deep amber-to-black radial gradient anchored at the
  bottom of the viewport (the "forge mouth"). Use `<canvas>` gradient,
  not CSS, so it composites correctly with additive ember rendering.
- `mobileFriendly: false` — cursor-driven interaction.

**Gotchas:**
- The mouse-bias direction is the *opposite* of cursor velocity — easy
  to get backwards. Verify by waving the cursor and watching whether the
  embers visually appear to be blown by the cursor (correct) or to
  follow it (wrong).
- Spark bursts should not all happen at the same height — randomize
  their burst altitude across the upper 60% of the viewport.
- The amber palette is the same as fireflies and dunes — make sure the
  forge's color is *more saturated* and *more red* (closer to `#ff6020`)
  to differentiate it.

**Complexity:** small. ~200 lines.

---

## Tier: Exotic (suggested weight: 2)

### Fireflies
Dozens of warm amber particles drift lazily with organic Perlin-noise
motion paths. Each one pulses its glow on a randomized sine cycle —
brightening and dimming like real fireflies. Mouse proximity causes
nearby fireflies to scatter briefly, then resettle. Dark and warm
instead of dark and cool — the only atmosphere that breaks the
cyan/magenta palette for full amber/gold.

**Suggested weight: 2** (total becomes 102, probability ~2.0%)

**Implementation notes:**
- 2D canvas on `#bg`.
- ~30–60 fireflies. Each has `(x, y, vx, vy, phase, freq, baseGlow)`.
- Motion: drift via low-frequency Perlin noise sampled at the firefly's
  position over time, plus inertia. Don't reuse `Math.random()` — use a
  small Perlin/simplex implementation or an inline gradient noise
  function. ~30 lines for a usable simplex2D.
- Glow pulse: `glow = baseGlow * (0.4 + 0.6 * (sin(t * freq + phase) ^ 2))`.
  The squared sine gives a sharper "off→on→off" rhythm than a plain sin.
- Render: additive radial gradient blob, similar to abyss but warm
  amber. Pre-render a grain sprite and `drawImage` it.
- Mouse interaction: within ~80px, push fireflies away with a soft
  spring repulsion (similar physics to dunes but less aggressive). They
  should *startle* not *flee* — feels more lifelike.
- `mobileFriendly: true` — gentle on CPU, touch interaction could
  substitute for mouse proximity.

**Gotchas:**
- Spring repulsion + damping needs to be tuned so fireflies feel like
  living creatures, not particles. They should *pause* briefly after
  scattering before drifting again. A small "stunned" timer per firefly
  helps sell it.
- Pulse rates should vary widely (0.4 Hz to 2 Hz) so the field never
  syncs up.
- Avoid overlapping clusters — repulsion between fireflies (very weak)
  helps space them out.

**Complexity:** medium. ~250 lines including the noise function.

---

### Sonar
A single ping emanates from the center of the screen every few seconds —
an expanding ring that reveals hidden geometry as it passes over it. The
geometry is a low-poly wireframe of the site's content layout (the
panels, the grid) rendered as a ghostly radar return that fades as the
ring passes. Military green monochrome, like an actual submarine sonar
display. Mouse click triggers an extra ping.

**Suggested weight: 2** (total becomes 102, probability ~2.0%)

**Implementation notes:**
- 2D canvas on `#bg`.
- Geometry: pre-generate a sparse field of "contacts" — random points
  scattered across the viewport, plus 4–6 polygonal "structures"
  (rectangles, hexagons, irregular shapes). These represent submerged
  objects.
- Ping state: `(originX, originY, radius, age, intensity)`. Active pings
  grow `radius` at constant speed (~200 px/s).
- Per contact: `lastIlluminatedAt` timestamp. Each frame, for each
  active ping, check if the contact is within `[radius - thickness,
  radius + thickness]` of the ping origin — if so, set
  `lastIlluminatedAt = now`.
- Render contacts with intensity based on `(now - lastIlluminatedAt)` —
  bright green right after illumination, fading to invisible over ~3s.
- Render polygonal structures the same way but stroke each edge
  individually so the ring "sweeps across" the shape rather than
  illuminating the whole polygon at once.
- Auto-ping every 4 seconds. Click anywhere to trigger an extra ping at
  the click position.
- Add a faint sweeping arm rotating from center, like a real radar
  display, just for atmosphere.
- `mobileFriendly: false` — click-to-ping doesn't translate well to
  touch, and the constant rendering is CPU-heavy.

**Gotchas:**
- The "ring sweeps across geometry" effect requires per-edge or per-pixel
  illumination. For polygons, sample N points along each edge and check
  each against the ring.
- Contact density matters — too few feels empty, too many feels noisy.
  Aim for ~40 point contacts plus 5 structures.
- Use `#0a4020` for unilluminated geometry (barely visible) and
  `#39ff7a` (the old battlezone green) for the active sweep.

**Complexity:** medium. ~280 lines. The phosphor-green palette would
also be a nice callback to the battlezone variant we removed.

---

### Roots
Starts empty. Over 30–60 seconds, fractal tree branches slowly grow from
the bottom of the viewport upward using L-system rules — white branches
splitting recursively. Mouse proximity accelerates local growth. If you
stay on the page long enough the entire screen fills with a white-on-black
fractal canopy. Leaving and coming back (cookie persists the variant)
starts the growth over. The only atmosphere that rewards patience.

**Suggested weight: 2**

**Implementation notes:**
- 2D canvas on `#bg`.
- Use a stochastic L-system or recursive branching algorithm. Each
  "branch" is a tree node with `(startX, startY, endX, endY, age,
  growth, depth, children: [], maxLength)`.
- Growth animation: each branch starts at length 0 and grows to its
  `maxLength` over a few seconds (`growth: 0..1` lerps). When `growth`
  hits ~0.7, spawn 2–3 child branches at the tip with random angles
  (±30° from parent direction) and shorter `maxLength` (parent ×
  ~0.7–0.85).
- Spawn 3–5 root trees from the bottom edge initially.
- Mouse acceleration: branches whose tip is within ~120 px of the cursor
  grow faster (`growth += dt * 2.5` instead of `dt * 0.4`).
- Render: thin white strokes, line width inversely proportional to
  depth. Add subtle alpha so older branches feel less prominent than
  young growing tips.
- After ~5 seconds of total growth, occasional "leaves" (small dots) at
  branch tips at the deepest depth.
- `mobileFriendly: true` — growth is time-based, mouse just accelerates.

**Gotchas:**
- Branch count grows exponentially. Cap recursion depth at ~7 to avoid
  unbounded growth. Even at depth 7 you'll have 2^7 = 128 branches per
  tree × 5 trees = 640 branches, which is fine.
- Persistence across navigation is *only* for the current page load.
  When the cookie variant matches but the user navigates away and back,
  the canvas resets — that's the intended "starts over" behavior. Don't
  serialize tree state to the cookie.
- L-system parameters matter a lot for visual quality. Test with both
  symmetric and asymmetric splitting to see which feels more organic.

**Complexity:** small to medium. ~220 lines. The L-system is the easy
part; getting the visual to feel *alive* rather than algorithmic is the
hard part.

---

### Aurora
Undulating curtains of light ripple across the top third of the
viewport, simulated with layered sine waves controlling vertical
displacement and opacity of gradient bands. Colors shift slowly between
green, cyan, and violet — the real aurora palette, not the site's usual
neon. Mouse Y position subtly influences the wave frequency. Very slow,
very calm, very Pacific Northwest if you've ever driven to eastern
Oregon on a clear winter night.

**Suggested weight: 2**

**Implementation notes:**
- WebGL is the right tool for this — Three.js with a custom
  ShaderMaterial. Could be done in 2D canvas but you'd be CPU-bound on
  the alpha compositing.
- A full-viewport quad with a fragment shader. The shader:
  - For each pixel, compute its distance to a curtain centerline
    `centerY = curtainBaseY + sum(amplitude_i * sin(x * freq_i + phase_i + time))`
    summed over 4–6 sine layers with different frequencies.
  - Compute alpha based on `1 - abs(pixel.y - centerY) / curtainThickness`.
  - Color: HSV cycling slowly through (120°, 180°, 270°) — green to
    cyan to violet — with slight noise so the curtain has color
    variation along its length.
  - Add a soft vertical gradient so the curtain fades both at top and
    bottom (no hard edges).
- Multiple curtains: render 3–4 stacked curtains with slightly different
  parameters. Each with its own time offset.
- Mouse Y: subtly modulates the frequency of the slowest sine layer
  so the user feels they're influencing the curtain shape. Don't let
  the curtain *follow* the cursor — that breaks the natural feel.
- `mobileFriendly: false` — shader-heavy, burns battery.

**Gotchas:**
- Aurora is famously hard to render convincingly. The biggest mistake
  is making the curtains too uniform — real aurora has soft holes,
  varying brightness along its length, and chaotic flicker. Add at
  least one high-frequency, low-amplitude sine plus some noise.
- Color cycling should be slow — 30+ seconds per full cycle. Faster and
  it reads as glitchy.
- Performance: full-viewport fragment shader is ~2M pixel ops per frame
  on a 1080p monitor. Should be fine on any GPU but might tank on a
  passive-cooled laptop.

**Complexity:** medium. ~300 lines including the shader. The shader
itself is the bulk of the work.

---

## Tier: Legendary (suggested weight: 0.5)

### Transmission
The entire viewport is black. Then, character by character, a monospaced
message types itself out center-screen in dim green, CRT-style:

```
INCOMING TRANSMISSION...
ORIGIN: TUALATIN, OR...
SIGNAL AUTHENTICATED...
WELCOME.
```

After it finishes, it glitches, clears, and the page content fades in
with no background animation at all — just the scanlines. The quietest,
most narrative atmosphere. The only one that has a beginning and an end.

**Suggested weight: 0.5** (total becomes 100.5, probability ~0.5%)

**Implementation notes:**
- 2D canvas on `#bg`. CSS for the scanlines is already in place.
- State machine:
  1. **Boot** (0–500ms): black screen
  2. **Type** (500ms–~4s): characters print one by one with a small
     random delay (~50ms ± 30ms) per character, plus longer pauses
     between lines (~400ms)
  3. **Glitch** (4–4.5s): the text flickers, characters are randomly
     replaced with garbage, then cleared
  4. **Quiescent**: black screen with scanlines, no animation, forever
- Font: should match the site's `--font-mono` (Share Tech Mono), 16px,
  rendered crisply.
- Color: `#39ff7a` (the battlezone green again) at low opacity (0.7).
  Add a slight glow via `shadowColor` + `shadowBlur` for the CRT feel.
- Cursor: a blinking block cursor (`█`) that blinks at ~2 Hz while
  typing and after typing finishes (during the glitch and quiescent
  phases).
- Mouse: ignored. This atmosphere does not respond to mouse — it has
  its own narrative arc.
- Mass-replace text with garbage characters (`█▓▒░░ ▒█░░▓`) during the
  glitch phase, every ~50ms for ~500ms.
- `mobileFriendly: true` — no cursor dependency, minimal rendering.

**Gotchas:**
- Type-on speed is critical. Too fast feels like a cheap effect; too
  slow feels broken. Aim for 18–25 characters per second average.
- The "quiescent" phase is the hardest part to commit to — it's
  *literally nothing*, which feels broken if you don't trust the
  decision. The point is to make the visitor feel like they've crossed
  a threshold. Don't add a fallback animation.
- Make sure the canvas is fully cleared in the quiescent phase so the
  text doesn't ghost. Otherwise readers will see fragments of garbage.
- The "ORIGIN" line could optionally be parameterized by IP geolocation
  if Cloudflare can inject a header — but Tualatin works fine as a
  default and matches the footer.

**Complexity:** small. ~180 lines. The simplest atmosphere visually,
but the most narrative. Quality is in the timing.

---

## Weight impact summary

If all proposed atmospheres were added at their suggested weights
(excluding Transmission, which is deferred):

| Variant        | Weight | Current % | With all new |
|----------------|--------|-----------|--------------|
| starfield      | 80     | 80.0%     | 43.5%        |
| vaporwave      | 40     | 4.0%*    | 21.7%        |
| mobius          | 4      | 4.0%      | 2.2%         |
| tesseract      | 4      | 4.0%      | 2.2%         |
| abyss          | 4      | 4.0%      | 2.2%         |
| dunes          | 4      | 4.0%      | 2.2%         |
| constellation  | 40     | —         | 21.7%        |
| rain           | 4      | —         | 2.2%         |
| forge          | 4      | —         | 2.2%         |
| fireflies      | 2      | —         | 1.1%         |
| sonar          | 2      | —         | 1.1%         |
| roots          | 2      | —         | 1.1%         |
| aurora         | 2      | —         | 1.1%         |
| **Total**      | **192** |          |              |

\* Vaporwave's weight increases from 4 to 40 as part of this batch.

Starfield drops from sole default to ~44%, sharing the top tier with
vaporwave and constellation (~22% each). The rare/exotic variants
collectively account for ~13%, spread across meaningful probability
tiers. No existing rare weights need to change — only vaporwave gets
bumped up.

---

## Author's recommendations on prioritization

If picking three to build next, I'd go in this order:

1. **Rain** — fills the genuine gap in the current lineup (no calm,
   organic, monochrome atmosphere). Cheap to build. The cellular wave
   sim is also a fun engineering exercise.
2. **Sonar** — leans into the security/defense background that the site
   already centers in its case studies. Reuses the phosphor green
   palette from the removed battlezone variant, which is a nice
   callback.
3. **Transmission** — the perfect legendary. Pure storytelling, minimal
   code, maximal impact. The kind of thing someone screenshots and
   sends to a friend.

Aurora is the one I'd save for when there's time to do it right — it's
the most technically demanding and also the easiest to ruin.

---

## Resolved design questions

- **`prefers-reduced-motion`**: Implemented. Visitors with
  `prefers-reduced-motion: reduce` are locked to starfield. The loader
  force-rewrites the cookie on every load.
- **Cookie expiration per variant**: Implemented. Expiry scales inversely
  with weight via linear interpolation (weight 80 → 24h, weight 20 →
  168h), clamped to [24h, 30d].
- **Mobile-specific subset**: Implemented. Variants with
  `mobileFriendly: false` have their effective weight divided by 10 on
  touch-primary devices.

## Open design questions

- **Should the legendary tier exist at all?** Weight 0.5 out of 115.5
  total means roughly 1 in 230 visitors. If the site gets 100 unique
  visitors per day, that's one legendary roll every ~2.3 days. Feels
  discoverable enough, especially if someone shares it.
- **New rarity display tier?** The `/atmosphere/` collection page
  currently has three tiers: `default`, `rare`, `exotic`. If we add
  weight-1 and weight-0.5 variants, do we need a fourth tier
  (`legendary`?) or can `exotic` cover everything below weight 4?
- **Screenshot regeneration**: New atmospheres need screenshots added to
  `images/atmo/`. Run `node scripts/capture-atmospheres.js` after
  adding any new variant. The script auto-discovers variants from the
  registry.
