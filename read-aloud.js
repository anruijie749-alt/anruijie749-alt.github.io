/* 朗读本文 · 2026-11-27
   纯浏览器原生 speechSynthesis：不调用任何外部服务、不上传任何数据、不改动页面正文。
   v2：收起时是一个小圆按钮；播放时是底部一条细播放条，可拖进度条跳到任意位置，
   支持上一段/下一段重听、暂停后从字中间接着读（不跳回段首）、记住上次听到的位置。 */
(function () {
  'use strict';

  if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
    return;
  }

  var RATES = [0.7, 0.9, 1.1, 1.3];
  var RATE_DEFAULT = 0.9;
  var CHARS_PER_SEC = 6.2;
  var SEG_MAX = 60;
  var POS_TTL = 3 * 24 * 3600 * 1000;

  var state = {
    rate: RATE_DEFAULT,
    queue: [],
    offs: [],
    total: 0,
    idx: 0,
    curChar: 0,
    active: false,
    paused: false,
    seeking: false,
    utt: null,
    hinted: false,
    errCount: 0,
    uid: 0,
    cps: 6.2,
    calib: 0,
    segStart: 0,
    segBase: 0,
    ticker: 0
  };

  var SKIP_SEL = [
    'nav', 'header', 'footer', 'aside', 'form', 'button', 'input', 'select',
    'textarea', 'script', 'style', 'noscript', 'ins', 'iframe', 'svg',
    '.ra-bar', '.ra-hint',
    '.navbar', '.nav-container', '.nav-menu', '.dropdown-menu',
    '.ad-slot', '.adsbygoogle', '[class*="advert"]',
    '[class*="pay-"]', '[class*="donate"]', '[class*="reward"]',
    '[id*="footer"]', '[class*="footer"]', '[class*="breadcrumb"]'
  ].join(',');

  function blocked(el) {
    try {
      return !!el.closest(SKIP_SEL);
    } catch (e) {
      return false;
    }
  }

  function clean(str) {
    var s = String(str == null ? '' : str);
    s = s.replace(/[\u200b-\u200f\ufeff]/g, '');
    try {
      s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/gu, '');
    } catch (e) {
      s = s.replace(/[\u2600-\u27BF]/g, '');
    }
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function splitSentences(text) {
    var out = [];
    var buf = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if ('。！？；!?;'.indexOf(ch) >= 0 || buf.length >= SEG_MAX) {
        out.push(buf);
        buf = '';
      }
    }
    if (buf.trim()) {
      out.push(buf);
    }
    return out;
  }

  function collectBlocks() {
    var out = [];
    var els = document.querySelectorAll('h1,h2,h3,h4,p,li');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (blocked(el)) {
        continue;
      }
      if (el.tagName === 'LI' && el.querySelector('li')) {
        continue;
      }
      if (el.tagName === 'LI' && el.querySelector('p')) {
        continue;
      }
      if (out.indexOf(el) !== -1) {
        continue;
      }
      if (clean(el.textContent).length < 6) {
        continue;
      }
      out.push(el);
    }
    return out;
  }

  function buildQueue() {
    var blocks = collectBlocks();
    var q = [];
    var offs = [];
    var total = 0;
    for (var i = 0; i < blocks.length; i++) {
      var text = clean(blocks[i].textContent);
      if (!text) {
        continue;
      }
      var segs = splitSentences(text);
      for (var j = 0; j < segs.length; j++) {
        var s = segs[j].trim();
        if (s.length < 2) {
          continue;
        }
        offs.push(total);
        total += s.length;
        q.push({ text: s, el: blocks[i] });
      }
    }
    state.queue = q;
    state.offs = offs;
    state.total = total;
    return q;
  }

  var cachedVoice = null;
  var voiceSearched = false;

  function pickVoice() {
    if (voiceSearched && cachedVoice) {
      return cachedVoice;
    }
    var list = [];
    try {
      list = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      list = [];
    }
    if (!list.length) {
      return null;
    }
    var zh = [];
    for (var i = 0; i < list.length; i++) {
      if (/^zh/i.test(list[i].lang || '')) {
        zh.push(list[i]);
      }
    }
    if (!zh.length) {
      voiceSearched = true;
      return null;
    }
    var pick = null;
    for (var k = 0; k < zh.length; k++) {
      if (/CN|Hans|Chinese|普通话|中文/i.test((zh[k].lang || '') + ' ' + (zh[k].name || ''))) {
        pick = zh[k];
        break;
      }
    }
    cachedVoice = pick || zh[0];
    voiceSearched = true;
    return cachedVoice;
  }

  try {
    window.speechSynthesis.onvoiceschanged = function () {
      voiceSearched = false;
      cachedVoice = null;
      pickVoice();
    };
  } catch (e) {}

  /* ---------- 高亮 ---------- */

  function highlight(el) {
    var old = document.querySelectorAll('.ra-hl');
    for (var i = 0; i < old.length; i++) {
      old[i].classList.remove('ra-hl');
    }
    if (!el) {
      return;
    }
    el.classList.add('ra-hl');
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (e) {}
  }

  function clearHighlight() {
    var old = document.querySelectorAll('.ra-hl');
    for (var i = 0; i < old.length; i++) {
      old[i].classList.remove('ra-hl');
    }
  }

  /* ---------- 样式 ---------- */

  var SVG = {
    play: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 6h2v12H6zM20 6l-9 6 9 6z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18 6h2v12h-2zM4 6l9 6-9 6z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L12 13.4l-6.3 6.3L4.3 18.3 10.6 12 4.3 5.7 5.7 4.3 12 10.6l6.3-6.3z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 9h3l4-4v14l-4-4H4zM15.5 8.5a4 4 0 0 1 0 7v-2a2 2 0 0 0 0-3zM17.8 5.6a7.5 7.5 0 0 1 0 12.8v-2a5.5 5.5 0 0 0 0-8.8z"/></svg>'
  };

  function ensureStyles() {
    if (document.getElementById('ra-style')) {
      return;
    }
    var css = [
      '.ra-bar{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9998;font-family:inherit;display:flex;justify-content:flex-end;}',
      '.ra-fab{width:44px;height:44px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;',
      'color:#00f2fe;background:rgba(9,20,26,.72);border:1px solid rgba(0,242,254,.45);',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;',
      'box-shadow:0 4px 16px rgba(0,0,0,.32);transition:transform .16s ease,box-shadow .16s ease;}',
      '.ra-fab:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,242,254,.28);}',
      '.ra-fab:focus-visible{outline:3px solid #00f2fe;outline-offset:3px;}',
      '.ra-panel{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;',
      'width:min(560px,calc(100vw - 32px));box-sizing:border-box;',
      'background:rgba(9,20,26,.88);border:1px solid rgba(0,242,254,.26);color:#eafcff;',
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 10px 28px rgba(0,0,0,.45);}',
      '.ra-btn{-webkit-appearance:none;appearance:none;width:28px;height:28px;flex:0 0 auto;padding:0;border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;cursor:pointer;',
      'color:#bdf3ff;background:rgba(0,242,254,.10);border:1px solid rgba(0,242,254,.26);transition:background .15s ease;}',
      '.ra-btn:hover{background:rgba(0,242,254,.22);}',
      '.ra-btn:focus-visible{outline:2px solid #00f2fe;outline-offset:2px;}',
      '.ra-play{width:32px;height:32px;background:#00f2fe;color:#062b32;border:0;}',
      '.ra-play:hover{background:#5cf7ff;}',
      '.ra-track{position:relative;flex:1 1 auto;min-width:56px;height:26px;display:flex;align-items:center;cursor:pointer;touch-action:none;}',
      '.ra-track::before{content:"";position:absolute;left:0;right:0;height:4px;border-radius:2px;background:rgba(255,255,255,.20);}',
      '.ra-fill{position:absolute;left:0;height:4px;border-radius:2px;width:0;background:linear-gradient(90deg,#00f2fe,#7cf6ff);}',
      '.ra-thumb{position:absolute;left:0;width:11px;height:11px;border-radius:50%;background:#fff;',
      'transform:translateX(-5.5px);pointer-events:none;box-shadow:0 0 0 3px rgba(0,242,254,.22);}',
      '.ra-track:focus-visible{outline:2px solid #00f2fe;outline-offset:4px;border-radius:4px;}',
      '.ra-time{flex:0 0 auto;font-size:11.5px;line-height:1;color:#9fe9f3;font-variant-numeric:tabular-nums;letter-spacing:.02em;}',
      '.ra-rate{flex:0 0 auto;font-size:11.5px;line-height:1;padding:5px 7px;border-radius:999px;cursor:pointer;',
      'color:#bdf3ff;background:rgba(0,242,254,.08);border:1px solid rgba(0,242,254,.26);font-variant-numeric:tabular-nums;}',
      '.ra-rate:hover{background:rgba(0,242,254,.20);}',
      '.ra-close{background:transparent;border:0;color:#9fe9f3;opacity:.7;}',
      '.ra-close:hover{opacity:1;background:rgba(255,255,255,.10);}',
      '.ra-hint{position:fixed;right:16px;bottom:calc(80px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:290px;',
      'padding:12px 14px;font-size:14px;line-height:1.6;color:#3a2a00;background:#ffe9a8;border-radius:12px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.35);}',
      '.ra-hint button{margin-top:8px;padding:8px 14px;font-size:14px;border:0;border-radius:8px;background:#3a2a00;color:#ffe9a8;cursor:pointer;}',
      '.ra-toast{position:fixed;left:50%;bottom:calc(80px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9999;',
      'padding:8px 14px;font-size:13px;color:#eafcff;background:rgba(9,20,26,.9);border:1px solid rgba(0,242,254,.3);',
      'border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.35);white-space:nowrap;}',
      '.ra-hl{background:rgba(255,235,120,.22);box-shadow:inset 3px 0 0 #ffd700;border-radius:4px;}',
      'body.ra-reading .ra-fab{display:none;}',
      '@media (max-width:600px){',
      '.ra-bar{right:10px;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));}',
      '.ra-panel{width:100%;gap:6px;padding:7px 9px;flex-wrap:wrap;justify-content:center;}',
      '.ra-track{order:10;flex:1 0 100%;min-width:0;height:28px;margin-top:1px;}',
      '.ra-thumb{width:15px;height:15px;transform:translateX(-7.5px);}',
      '.ra-time{font-size:11px;}',
      '.ra-hint{left:10px;right:10px;max-width:none;bottom:calc(96px + env(safe-area-inset-bottom,0px));}',
      '}'
    ].join('');
    var tag = document.createElement('style');
    tag.id = 'ra-style';
    tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  }

  /* ---------- UI ---------- */

  var UI = {};

  function mkBtn(cls, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    if (label) {
      b.setAttribute('aria-label', label);
      b.title = label;
    }
    return b;
  }

  function buildUI() {
    ensureStyles();

    var bar = document.createElement('div');
    bar.className = 'ra-bar';
    bar.id = 'ra-bar';

    var fab = mkBtn('ra-fab', '朗读本文');
    fab.id = 'ra-fab';
    fab.innerHTML = SVG.sound;

    var panel = document.createElement('div');
    panel.className = 'ra-panel';
    panel.id = 'ra-panel';
    panel.hidden = true;

    var play = mkBtn('ra-btn ra-play', '播放');
    play.id = 'ra-play';
    play.innerHTML = SVG.play;

    var prev = mkBtn('ra-btn ra-skip', '上一段（重听）');
    prev.id = 'ra-prev';
    prev.innerHTML = SVG.prev;

    var next = mkBtn('ra-btn ra-skip', '下一段');
    next.id = 'ra-next';
    next.innerHTML = SVG.next;

    var track = document.createElement('div');
    track.className = 'ra-track';
    track.id = 'ra-track';
    track.setAttribute('role', 'slider');
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', '播放进度，左右方向键可微调');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', '0');
    var fill = document.createElement('div');
    fill.className = 'ra-fill';
    fill.id = 'ra-fill';
    var thumb = document.createElement('div');
    thumb.className = 'ra-thumb';
    thumb.id = 'ra-thumb';
    track.appendChild(fill);
    track.appendChild(thumb);

    var time = document.createElement('span');
    time.className = 'ra-time';
    time.id = 'ra-time';
    time.textContent = '00:00 / 00:00';

    var rate = document.createElement('button');
    rate.type = 'button';
    rate.className = 'ra-rate';
    rate.id = 'ra-rate';
    rate.setAttribute('aria-label', '调整语速');
    rate.title = '调整语速';

    var close = mkBtn('ra-btn ra-close', '关闭朗读条');
    close.id = 'ra-close';
    close.innerHTML = SVG.close;

    panel.appendChild(play);
    panel.appendChild(prev);
    panel.appendChild(next);
    panel.appendChild(track);
    panel.appendChild(time);
    panel.appendChild(rate);
    panel.appendChild(close);

    bar.appendChild(fab);
    bar.appendChild(panel);
    document.body.appendChild(bar);

    UI.bar = bar;
    UI.fab = fab;
    UI.panel = panel;
    UI.play = play;
    UI.prev = prev;
    UI.next = next;
    UI.track = track;
    UI.fill = fill;
    UI.thumb = thumb;
    UI.time = time;
    UI.rate = rate;
    UI.close = close;

    fab.addEventListener('click', function () {
      if (!state.active) {
        start(true);
      } else {
        panel.hidden = !panel.hidden;
      }
    });

    play.addEventListener('click', function () {
      if (!state.active) {
        start(true);
        return;
      }
      if (state.paused) {
        doResume();
      } else {
        doPause();
      }
    });

    prev.addEventListener('click', function () {
      if (!state.active) {
        return;
      }
      var t = state.idx - 1;
      if (t < 0) {
        t = 0;
      }
      jumpTo(t, 0, true);
    });

    next.addEventListener('click', function () {
      if (!state.active) {
        return;
      }
      jumpTo(Math.min(state.idx + 1, state.queue.length - 1), 0, true);
    });

    rate.addEventListener('click', function () {
      var i = RATES.indexOf(state.rate);
      state.rate = RATES[(i + 1) % RATES.length];
      state.cps = CHARS_PER_SEC * (state.rate / RATE_DEFAULT);
      updateRateLabel();
      if (state.active) {
        updateProgress();
        if (!state.paused) {
          jumpTo(state.idx, state.curChar, true);
        }
      }
    });

    close.addEventListener('click', function () {
      stop(true);
    });

    track.addEventListener('pointerdown', function (ev) {
      if (!state.active) {
        return;
      }
      state.seeking = true;
      try {
        track.setPointerCapture(ev.pointerId);
      } catch (e) {}
      previewAt(posFromEvent(ev));
      ev.preventDefault();
    });

    track.addEventListener('pointermove', function (ev) {
      if (!state.seeking) {
        return;
      }
      previewAt(posFromEvent(ev));
    });

    function endSeek(ev) {
      if (!state.seeking) {
        return;
      }
      state.seeking = false;
      var p = posFromEvent(ev);
      var idx = idxFromPct(p);
      jumpTo(idx, 0, !state.paused);
      updateProgress();
    }

    track.addEventListener('pointerup', endSeek);
    track.addEventListener('pointercancel', function () {
      state.seeking = false;
      updateProgress();
    });

    track.addEventListener('keydown', function (ev) {
      if (!state.active) {
        return;
      }
      var step = state.total ? 1 / Math.max(20, state.queue.length) : 0.05;
      var p = readChars() / (state.total || 1);
      if (ev.key === 'ArrowRight') {
        jumpTo(idxFromPct(Math.min(1, p + step)), 0, !state.paused);
        ev.preventDefault();
      } else if (ev.key === 'ArrowLeft') {
        jumpTo(idxFromPct(Math.max(0, p - step)), 0, !state.paused);
        ev.preventDefault();
      }
    });

    updateRateLabel();
    updateProgress();
  }

  function posFromEvent(ev) {
    var r = UI.track.getBoundingClientRect();
    if (!r.width) {
      return 0;
    }
    var x = (ev.clientX - r.left) / r.width;
    return Math.min(1, Math.max(0, x));
  }

  function idxFromPct(p) {
    if (!state.queue.length) {
      return 0;
    }
    var target = p * state.total;
    for (var i = state.queue.length - 1; i >= 0; i--) {
      if (state.offs[i] <= target) {
        return i;
      }
    }
    return 0;
  }

  function readChars() {
    return (state.offs[state.idx] || 0) + state.curChar;
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) {
      sec = 0;
    }
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function estTotal() {
    return state.total / Math.max(0.8, state.cps);
  }

  function paintProgress(p) {
    if (!UI.fill) {
      return;
    }
    var pct = Math.min(1, Math.max(0, p));
    UI.fill.style.width = (pct * 100) + '%';
    UI.thumb.style.left = (pct * 100) + '%';
    UI.time.textContent = fmt(pct * estTotal()) + ' / ' + fmt(estTotal());
    UI.track.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
  }

  function updateProgress() {
    if (state.seeking) {
      return;
    }
    var p = state.total ? readChars() / state.total : 0;
    paintProgress(p);
  }

  function previewAt(p) {
    paintProgress(p);
  }

  function startTicker() {
    stopTicker();
    state.ticker = window.setInterval(function () {
      if (!state.active || state.paused || state.seeking) {
        return;
      }
      var item = state.queue[state.idx];
      if (!item) {
        return;
      }
      var pred = state.segBase + ((Date.now() - state.segStart) / 1000) * state.cps;
      if (pred > item.text.length) {
        pred = item.text.length;
      }
      if (pred > state.curChar) {
        state.curChar = pred;
        updateProgress();
      }
    }, 400);
  }

  function stopTicker() {
    if (state.ticker) {
      window.clearInterval(state.ticker);
      state.ticker = 0;
    }
  }

  function updateRateLabel() {
    if (!UI.rate) {
      return;
    }
    UI.rate.textContent = state.rate.toFixed(1) + '×';
  }

  function setPlayingIcon(playing) {
    if (!UI.play) {
      return;
    }
    UI.play.innerHTML = playing ? SVG.pause : SVG.play;
    UI.play.setAttribute('aria-label', playing ? '暂停' : '播放');
    UI.play.title = playing ? '暂停' : '继续';
  }

  function showToast(text) {
    var box = document.createElement('div');
    box.className = 'ra-toast';
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(function () {
      if (box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 2600);
  }

  function showHint() {
    if (state.hinted) {
      return;
    }
    state.hinted = true;
    var box = document.createElement('div');
    box.className = 'ra-hint';
    box.setAttribute('role', 'alert');
    var p = document.createElement('div');
    p.textContent = '这台设备的浏览器没有可用的中文语音，读不出声音。可以试试：用手机微信或手机浏览器打开本页再点朗读；或在电脑「设置 → 时间和语言 → 语音」里添加中文语音包。';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = '知道了';
    ok.addEventListener('click', function () {
      if (box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });
    box.appendChild(p);
    box.appendChild(ok);
    document.body.appendChild(box);
    setTimeout(function () {
      if (box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 15000);
  }

  /* ---------- 位置记忆 ---------- */

  function posKey() {
    return 'ra-pos:' + location.pathname;
  }

  function savePos() {
    try {
      if (!state.total || state.idx <= 0) {
        return;
      }
      window.localStorage.setItem(posKey(), JSON.stringify({
        i: state.idx, o: state.curChar, t: Date.now(), tot: state.total
      }));
    } catch (e) {}
  }

  function loadPos() {
    try {
      var r = JSON.parse(window.localStorage.getItem(posKey()) || 'null');
      if (r && r.t && (Date.now() - r.t) < POS_TTL && r.i > 0) {
        return r;
      }
    } catch (e) {}
    return null;
  }

  function clearPos() {
    try {
      window.localStorage.removeItem(posKey());
    } catch (e) {}
  }

  /* ---------- 播放 ---------- */

  function speakAt(i, offset) {
    if (!state.active) {
      return;
    }
    if (i >= state.queue.length) {
      finish();
      return;
    }
    state.idx = i;
    state.paused = false;
    setPlayingIcon(true);

    var item = state.queue[i];
    var off = offset || 0;
    if (off >= item.text.length - 1) {
      off = 0;
    }
    state.curChar = off;
    state.segBase = off;
    state.segStart = Date.now();
    startTicker();

    var token = ++state.uid;
    var u = new SpeechSynthesisUtterance(item.text.slice(off));
    u.lang = 'zh-CN';
    u.rate = state.rate;
    u.pitch = 1;
    var v = pickVoice();
    if (v) {
      u.voice = v;
    }
    highlight(item.el);
    updateProgress();

    u.onboundary = function (ev) {
      if (token !== state.uid) {
        return;
      }
      if (ev && typeof ev.charIndex === 'number' && ev.charIndex >= 0) {
        var dt = (Date.now() - state.segStart) / 1000;
        var read = off + ev.charIndex;
        if (dt > 1.2 && ev.charIndex > 8 && state.calib < 10) {
          var v = ev.charIndex / dt;
          if (v > 1 && v < 20) {
            state.cps = state.cps * 0.65 + v * 0.35;
            state.calib++;
          }
        }
        if (read > state.curChar) {
          state.curChar = read;
          updateProgress();
        }
      }
    };

    u.onend = function () {
      if (token !== state.uid || !state.active || state.paused) {
        return;
      }
      state.errCount = 0;
      state.curChar = 0;
      savePos();
      speakAt(i + 1, 0);
    };

    u.onerror = function (ev) {
      if (token !== state.uid || !state.active) {
        return;
      }
      if (ev && (ev.error === 'interrupted' || ev.error === 'canceled')) {
        return;
      }
      state.errCount = (state.errCount || 0) + 1;
      if (state.errCount > 3) {
        finish();
        showHint();
        return;
      }
      speakAt(i + 1, 0);
    };

    state.utt = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      finish();
      return;
    }

    setTimeout(function () {
      if (token !== state.uid || !state.active || state.paused) {
        return;
      }
      var speaking = false;
      try {
        speaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
      } catch (e) {}
      if (!speaking) {
        showHint();
      }
    }, 2600);
  }

  function jumpTo(i, offset, play) {
    if (!state.queue.length) {
      return;
    }
    state.uid++;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    state.idx = i;
    state.curChar = offset || 0;
    state.segBase = offset || 0;
    state.segStart = Date.now();
    updateProgress();
    savePos();
    if (play === false) {
      state.paused = true;
      setPlayingIcon(false);
      if (state.queue[i] && state.queue[i].el) {
        highlight(state.queue[i].el);
      }
      return;
    }
    setTimeout(function () {
      if (!state.active) {
        return;
      }
      speakAt(i, offset || 0);
    }, 60);
  }

  function start(resume) {
    buildQueue();
    if (!state.queue.length) {
      return;
    }
    state.active = true;
    state.paused = false;
    state.errCount = 0;
    state.curChar = 0;
    document.body.classList.add('ra-reading');
    UI.panel.hidden = false;
    UI.fab.hidden = true;
    pickVoice();
    updateRateLabel();

    var resumed = false;
    if (resume) {
      var r = loadPos();
      if (r && r.i < state.queue.length && r.i > 0) {
        jumpTo(r.i, Math.min(r.o || 0, (state.queue[r.i].text.length - 2) || 0), true);
        resumed = true;
        showToast('接着上次听到的地方继续');
      }
    }
    if (!resumed) {
      jumpTo(0, 0, true);
    }
    updateProgress();
  }

  function doPause() {
    if (!state.active) {
      return;
    }
    state.paused = true;
    state.uid++;
    stopTicker();
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    setPlayingIcon(false);
    savePos();
  }

  function doResume() {
    if (!state.active) {
      return;
    }
    speakAt(state.idx, state.curChar);
  }

  function finish() {
    stop(false);
    clearPos();
    showToast('已读完本篇');
  }

  function stop(keepPos) {
    state.uid++;
    stopTicker();
    state.active = false;
    state.paused = false;
    state.seeking = false;
    state.utt = null;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    document.body.classList.remove('ra-reading');
    clearHighlight();
    if (keepPos) {
      savePos();
    }
    if (UI.panel) {
      UI.panel.hidden = true;
    }
    if (UI.fab) {
      UI.fab.hidden = false;
    }
    setPlayingIcon(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }

  window.addEventListener('beforeunload', function () {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  });
})();
