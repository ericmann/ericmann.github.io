// ═══════════════════════════════════════
// TRANSMISSION — reward-only
// One-shot typing sequence on a black screen. Green monospaced
// text types out line-by-line, holds, glitches, then fades to
// black and fires onComplete. Not in the weighted rotation —
// triggered only as a reward when all atmospheres are found.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let canvas, ctx, raf = 0;
  let W = 0, H = 0, dpr = 1;
  let isPreview = false;
  let onComplete = null;

  let timeouts = [];
  let phase = 'idle';
  let lines = [];
  let cursorVisible = true;
  let cursorInterval = 0;
  let typingLine = 0;
  let typingChar = 0;
  let glitchStart = 0;
  let destroyed = false;

  var MESSAGE = [
    'INCOMING TRANSMISSION...',
    'ORIGIN: TUALATIN, OR...',
    'SIGNAL AUTHENTICATED...',
    '',
    'WELCOME.',
    "YOU'VE FOUND ALL OF OUR ATMOSPHERES.",
    'GREAT WORK.',
    '',
    "LET'S KEEP IN TOUCH.",
    '\u2192 linkedin.com/in/ericallenmann',
  ];

  var GLITCH_CHARS = '\u2588\u2593\u2592\u2591';
  var CHAR_DELAY = 50;
  var CHAR_JITTER = 20;
  var LINE_PAUSE = 400;
  var BLANK_PAUSE = 200;
  var HOLD_DURATION = 3000;
  var GLITCH_DURATION = 500;
  var GLITCH_TICK = 50;
  var FONT_SIZE = 16;
  var LINE_HEIGHT = 24;

  function schedule(fn, ms) {
    var id = setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  }

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
  }

  function textOrigin() {
    var blockH = MESSAGE.length * LINE_HEIGHT;
    var x = W * 0.1;
    var y = Math.max(H * 0.3, (H - blockH) / 2);
    return { x: x, y: y };
  }

  function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    if (phase === 'boot' || phase === 'complete') return;

    ctx.font = FONT_SIZE + 'px monospace';
    ctx.shadowColor = '#39ff7a';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#39ff7a';
    ctx.textBaseline = 'top';

    var origin = textOrigin();
    var x0 = origin.x;
    var y0 = origin.y;

    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].join('');
      ctx.fillText(text, x0, y0 + i * LINE_HEIGHT);
    }

    if ((phase === 'type' || phase === 'hold') && cursorVisible) {
      var curLine = Math.min(typingLine, lines.length - 1);
      if (curLine >= 0 && lines[curLine]) {
        var lineText = lines[curLine].join('');
        var curX = x0 + ctx.measureText(lineText).width;
        var curY = y0 + curLine * LINE_HEIGHT;
        ctx.fillText('\u2588', curX, curY);
      }
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function frame() {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    render();
  }

  function typeNextChar() {
    if (destroyed || phase !== 'type') return;

    if (typingLine >= MESSAGE.length) {
      startHold();
      return;
    }

    var line = MESSAGE[typingLine];

    if (line.length === 0) {
      lines.push([]);
      typingLine++;
      typingChar = 0;
      schedule(typeNextChar, BLANK_PAUSE);
      return;
    }

    if (!lines[typingLine]) {
      lines[typingLine] = [];
    }

    if (typingChar < line.length) {
      lines[typingLine].push(line[typingChar]);
      typingChar++;
      var jitter = CHAR_DELAY + (Math.random() * 2 - 1) * CHAR_JITTER;
      schedule(typeNextChar, Math.max(10, jitter));
    } else {
      typingLine++;
      typingChar = 0;
      schedule(typeNextChar, LINE_PAUSE);
    }
  }

  function startHold() {
    phase = 'hold';
    schedule(startGlitch, HOLD_DURATION);
  }

  function startGlitch() {
    phase = 'glitch';
    glitchStart = performance.now();
    glitchTick();
  }

  function glitchTick() {
    if (destroyed) return;
    var elapsed = performance.now() - glitchStart;

    if (elapsed >= GLITCH_DURATION) {
      phase = 'complete';
      render();
      if (onComplete) onComplete();
      return;
    }

    for (var i = 0; i < lines.length; i++) {
      for (var j = 0; j < lines[i].length; j++) {
        if (Math.random() < 0.3) {
          lines[i][j] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
    }

    schedule(glitchTick, GLITCH_TICK);
  }

  function init(opts) {
    opts = opts || {};
    destroyed = false;
    isPreview = !!opts.preview;
    canvas = opts.canvas || document.getElementById('bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W = opts.width  || window.innerWidth;
    H = opts.height || window.innerHeight;
    onComplete = opts.onComplete || null;

    lines = [];
    typingLine = 0;
    typingChar = 0;
    phase = 'boot';

    applySize();

    cursorInterval = setInterval(function() {
      cursorVisible = !cursorVisible;
    }, 250);

    raf = requestAnimationFrame(frame);

    schedule(function() {
      phase = 'type';
      typeNextChar();
    }, 500);
  }

  function destroy() {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    for (var i = 0; i < timeouts.length; i++) clearTimeout(timeouts[i]);
    timeouts = [];
    if (cursorInterval) clearInterval(cursorInterval);
    cursorInterval = 0;
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    lines = [];
    phase = 'idle';
    canvas = ctx = null;
    onComplete = null;
    cursorVisible = true;
    typingLine = typingChar = 0;
    isPreview = false;
  }

  window.Atmospheres.transmission = { init: init, destroy: destroy, mobileFriendly: true };
})();
