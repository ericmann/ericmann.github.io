// ═══════════════════════════════════════
// TRANSMISSION — reward-only
// One-shot typing sequence on a black screen. Green monospaced
// text types out line-by-line, then waits for user input before
// glitching out and handing control to the normal atmosphere.
// Not in the weighted rotation — triggered only when all
// atmospheres have been seen.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  var canvas, ctx, raf = 0;
  var W = 0, H = 0, dpr = 1;
  var isPreview = false;
  var onComplete = null;

  var timeouts = [];
  var phase = 'idle';
  var lines = [];
  var cursorVisible = true;
  var cursorInterval = 0;
  var typingLine = 0;
  var typingChar = 0;
  var glitchStart = 0;
  var destroyed = false;
  var maxLineWidth = 0;
  var keyHandler = null;
  var linkEl = null;
  var holdPromptAlpha = 0;

  var LINKEDIN_URL = 'https://linkedin.com/in/ericallenmann';

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

  var PROMPT_TEXT = 'PRESS ENTER TO CONTINUE';
  var AUTO_DISMISS_MS = 30000;

  var GLITCH_CHARS = '\u2588\u2593\u2592\u2591';
  var CHAR_DELAY = 50;
  var CHAR_JITTER = 20;
  var LINE_PAUSE = 400;
  var BLANK_PAUSE = 200;
  var GLITCH_DURATION = 500;
  var GLITCH_TICK = 50;
  var FONT_SIZE = 16;
  var LINE_HEIGHT = 24;

  var LINKEDIN_LINE_INDEX = 9;

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

  function measureMaxLine() {
    if (!ctx || maxLineWidth > 0) return;
    ctx.font = FONT_SIZE + 'px monospace';
    maxLineWidth = 0;
    for (var i = 0; i < MESSAGE.length; i++) {
      var w = ctx.measureText(MESSAGE[i]).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }
    var pw = ctx.measureText(PROMPT_TEXT).width;
    if (pw > maxLineWidth) maxLineWidth = pw;
  }

  function textOrigin() {
    measureMaxLine();
    var totalLines = MESSAGE.length + 2;
    var blockH = totalLines * LINE_HEIGHT;
    var x = (W - maxLineWidth) / 2;
    var y = (H - blockH) / 2;
    return { x: Math.max(20, x), y: Math.max(20, y) };
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
      if (i === LINKEDIN_LINE_INDEX && phase === 'hold') continue;
      var text = lines[i].join('');
      ctx.fillText(text, x0, y0 + i * LINE_HEIGHT);
    }

    if (phase === 'type' && cursorVisible) {
      var curLine = Math.min(typingLine, lines.length - 1);
      if (curLine >= 0 && lines[curLine]) {
        var lineText = lines[curLine].join('');
        var curX = x0 + ctx.measureText(lineText).width;
        var curY = y0 + curLine * LINE_HEIGHT;
        ctx.fillText('\u2588', curX, curY);
      }
    }

    if (phase === 'hold' && holdPromptAlpha > 0) {
      var promptY = y0 + (MESSAGE.length + 1) * LINE_HEIGHT;
      ctx.globalAlpha = holdPromptAlpha * (cursorVisible ? 1.0 : 0.4);
      ctx.fillText(PROMPT_TEXT, x0, promptY);
      ctx.globalAlpha = 1.0;
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function positionLink() {
    if (!linkEl || !ctx) return;
    var origin = textOrigin();
    var x0 = origin.x;
    var y0 = origin.y + LINKEDIN_LINE_INDEX * LINE_HEIGHT;

    ctx.font = FONT_SIZE + 'px monospace';
    var arrowWidth = ctx.measureText('\u2192 ').width;

    linkEl.style.left = (x0 + arrowWidth) + 'px';
    linkEl.style.top = y0 + 'px';
  }

  function frame() {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);

    if (phase === 'hold' && holdPromptAlpha < 1) {
      holdPromptAlpha = Math.min(1, holdPromptAlpha + 0.02);
    }

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
    holdPromptAlpha = 0;

    createLink();

    keyHandler = function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        dismiss();
      }
    };
    document.addEventListener('keydown', keyHandler);

    schedule(dismiss, AUTO_DISMISS_MS);
  }

  function createLink() {
    linkEl = document.createElement('a');
    linkEl.href = LINKEDIN_URL;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener';
    linkEl.textContent = 'linkedin.com/in/ericallenmann';
    linkEl.style.cssText =
      'position:fixed;z-index:10000;' +
      'font:' + FONT_SIZE + 'px monospace;' +
      'color:#39ff7a;text-decoration:underline;' +
      'text-shadow:0 0 4px #39ff7a;' +
      'cursor:pointer;line-height:' + LINE_HEIGHT + 'px;' +
      'padding:0;margin:0;background:transparent;border:none;';
    document.body.appendChild(linkEl);
    positionLink();
  }

  function removeLink() {
    if (linkEl && linkEl.parentNode) {
      linkEl.parentNode.removeChild(linkEl);
    }
    linkEl = null;
  }

  function dismiss() {
    if (phase !== 'hold') return;
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    removeLink();
    startGlitch();
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
      showPageContent();
      document.body.style.cursor = '';
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

  var hiddenEls = [];

  function hidePageContent() {
    hiddenEls = [];
    var els = document.querySelectorAll('body > *:not(canvas#bg):not(canvas#fx):not(.scanlines)');
    for (var i = 0; i < els.length; i++) {
      els[i].style.opacity = '0';
      els[i].style.transition = 'none';
      els[i].style.pointerEvents = 'none';
      hiddenEls.push(els[i]);
    }
  }

  function showPageContent() {
    for (var i = 0; i < hiddenEls.length; i++) {
      hiddenEls[i].style.transition = 'opacity 0.8s ease-in';
      hiddenEls[i].style.opacity = '1';
      hiddenEls[i].style.pointerEvents = '';
    }
    hiddenEls = [];
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
    maxLineWidth = 0;
    holdPromptAlpha = 0;

    lines = [];
    typingLine = 0;
    typingChar = 0;
    phase = 'boot';

    applySize();

    if (!isPreview) {
      hidePageContent();
      document.body.style.cursor = 'none';
    }

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
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    removeLink();
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (hiddenEls.length) showPageContent();
    document.body.style.cursor = '';
    lines = [];
    phase = 'idle';
    canvas = ctx = null;
    onComplete = null;
    cursorVisible = true;
    typingLine = typingChar = 0;
    maxLineWidth = 0;
    holdPromptAlpha = 0;
    isPreview = false;
  }

  window.Atmospheres.transmission = { init: init, destroy: destroy, mobileFriendly: true };
})();
