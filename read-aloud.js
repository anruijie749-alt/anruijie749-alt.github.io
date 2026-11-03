/* 朗读本文 · 2026-11-03
   纯浏览器原生 speechSynthesis，不调用任何外部服务、不上传任何数据、不改动页面正文。
   适配中老年阅读：大按钮、慢语速、逐段高亮跟随。
   降低风险设计：不支持朗读的浏览器直接不显示按钮，页面表现与原来完全一致。 */
(function () {
  'use strict';

  if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
    return;
  }

  var RATE_DEFAULT = 0.9;
  var RATE_MIN = 0.6;
  var RATE_MAX = 1.3;
  var RATE_STEP = 0.1;

  var state = {
    rate: RATE_DEFAULT,
    queue: [],
    idx: 0,
    active: false,
    paused: false,
    utt: null,
    hinted: false
  };

  var SKIP_SEL = [
    'nav', 'header', 'footer', 'aside', 'form', 'button', 'input', 'select',
    'textarea', 'script', 'style', 'noscript', 'ins', 'iframe', 'svg',
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
    var max = 90;
    var out = [];
    var buf = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if ('。！？；!?;'.indexOf(ch) >= 0 || buf.length >= max) {
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
        q.push({ text: s, el: blocks[i] });
      }
    }
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

  function ensureStyles() {
    if (document.getElementById('ra-style')) {
      return;
    }
    var css = [
      '.ra-bar{position:fixed;right:18px;bottom:18px;z-index:9998;font-family:inherit;text-align:right;}',
      '.ra-main{display:inline-flex;align-items:center;gap:8px;padding:14px 22px;font-size:17px;font-weight:600;',
      'line-height:1.2;color:#062b32;background:#00f2fe;border:0;border-radius:40px;cursor:pointer;',
      'box-shadow:0 6px 20px rgba(0,0,0,.35);}',
      '.ra-main:hover{filter:brightness(1.06);}',
      '.ra-main:focus-visible{outline:3px solid #fff;outline-offset:3px;}',
      '.ra-ctrl{margin-top:10px;background:rgba(12,26,32,.96);border:1px solid rgba(0,242,254,.5);',
      'border-radius:14px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.45);}',
      '.ra-ctrl button{display:block;width:100%;margin:6px 0;padding:12px 16px;font-size:16px;min-width:150px;',
      'color:#eafcff;background:rgba(0,242,254,.14);border:1px solid rgba(0,242,254,.45);',
      'border-radius:10px;cursor:pointer;text-align:left;}',
      '.ra-ctrl button:hover{background:rgba(0,242,254,.24);}',
      '.ra-rate{display:block;margin-top:6px;font-size:14px;color:#9fe9f3;text-align:center;}',
      '.ra-hint{position:fixed;right:18px;bottom:150px;z-index:9999;max-width:300px;padding:14px 16px;',
      'font-size:15px;line-height:1.6;color:#3a2a00;background:#ffe9a8;border-radius:12px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.4);}',
      '.ra-hint button{margin-top:10px;padding:10px 16px;font-size:15px;border:0;border-radius:8px;',
      'background:#3a2a00;color:#ffe9a8;cursor:pointer;}',
      '.ra-hl{background:rgba(255,235,120,.22);box-shadow:inset 3px 0 0 #ffd700;border-radius:4px;}',
      'body.ra-reading .ra-main{background:#ffd700;color:#2b2200;}',
      '@media (max-width:600px){',
      '.ra-bar{right:12px;bottom:12px;left:12px;text-align:center;}',
      '.ra-main{width:100%;justify-content:center;font-size:18px;padding:15px 18px;}',
      '.ra-ctrl button{min-width:0;}',
      '.ra-hint{left:12px;right:12px;bottom:110px;max-width:none;}',
      '}'
    ].join('');
    var tag = document.createElement('style');
    tag.id = 'ra-style';
    tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  }

  function mkBtn(text, act, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-act', act);
    if (label) {
      b.setAttribute('aria-label', label);
    }
    b.textContent = text;
    return b;
  }

  function buildUI() {
    ensureStyles();

    var bar = document.createElement('div');
    bar.className = 'ra-bar';
    bar.id = 'ra-bar';

    var toggle = document.createElement('button');
    toggle.className = 'ra-main';
    toggle.id = 'ra-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', '朗读本文');
    toggle.innerHTML = '<span aria-hidden="true">🔊</span><span id="ra-label">朗读本文</span>';

    var ctrl = document.createElement('div');
    ctrl.className = 'ra-ctrl';
    ctrl.id = 'ra-ctrl';
    ctrl.hidden = true;

    ctrl.appendChild(mkBtn('⏸ 暂停', 'pause', '暂停朗读'));
    ctrl.appendChild(mkBtn('⏹ 停止', 'stop', '停止朗读'));
    ctrl.appendChild(mkBtn('🐢 慢一点', 'slower', '语速慢一点'));
    ctrl.appendChild(mkBtn('🐇 快一点', 'faster', '语速快一点'));

    var rate = document.createElement('span');
    rate.className = 'ra-rate';
    rate.id = 'ra-rate';
    ctrl.appendChild(rate);

    bar.appendChild(toggle);
    bar.appendChild(ctrl);
    document.body.appendChild(bar);

    toggle.addEventListener('click', function () {
      if (!state.active) {
        start();
      } else {
        ctrl.hidden = !ctrl.hidden;
      }
    });

    ctrl.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== ctrl && !t.getAttribute('data-act')) {
        t = t.parentNode;
      }
      if (!t || t === ctrl) {
        return;
      }
      var act = t.getAttribute('data-act');
      if (act === 'pause') {
        if (state.paused) {
          doResume();
        } else {
          doPause();
        }
      } else if (act === 'stop') {
        stop();
      } else if (act === 'slower') {
        setRate(state.rate - RATE_STEP);
      } else if (act === 'faster') {
        setRate(state.rate + RATE_STEP);
      }
    });

    updateRateLabel();
  }

  function updateRateLabel() {
    var el = document.getElementById('ra-rate');
    if (!el) {
      return;
    }
    var tag = '正常';
    if (state.rate <= 0.72) {
      tag = '很慢';
    } else if (state.rate < 0.88) {
      tag = '慢';
    } else if (state.rate > 1.08) {
      tag = '快';
    }
    el.textContent = '语速：' + tag + '（' + Math.round(state.rate * 100) / 100 + ' 倍）';
  }

  function setRate(v) {
    if (v < RATE_MIN) {
      v = RATE_MIN;
    }
    if (v > RATE_MAX) {
      v = RATE_MAX;
    }
    state.rate = Math.round(v * 10) / 10;
    updateRateLabel();
    if (state.active && !state.paused) {
      var at = state.idx;
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      speakAt(at);
    }
  }

  function setLabel(text) {
    var el = document.getElementById('ra-label');
    if (el) {
      el.textContent = text;
    }
  }

  function setPauseText(paused) {
    var btn = document.querySelector('.ra-ctrl button[data-act="pause"]');
    if (btn) {
      btn.textContent = paused ? '▶ 继续' : '⏸ 暂停';
      btn.setAttribute('aria-label', paused ? '继续朗读' : '暂停朗读');
    }
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

  function speakAt(i) {
    if (!state.active) {
      return;
    }
    if (i >= state.queue.length) {
      stop();
      return;
    }
    state.idx = i;
    state.paused = false;
    setPauseText(false);

    var item = state.queue[i];
    var u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'zh-CN';
    u.rate = state.rate;
    u.pitch = 1;
    var v = pickVoice();
    if (v) {
      u.voice = v;
    }
    highlight(item.el);

    u.onend = function () {
      if (!state.active || state.paused) {
        return;
      }
      speakAt(i + 1);
    };
    u.onerror = function (ev) {
      if (!state.active) {
        return;
      }
      if (ev && (ev.error === 'interrupted' || ev.error === 'canceled')) {
        return;
      }
      speakAt(i + 1);
    };

    state.utt = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      stop();
      return;
    }

    setTimeout(function () {
      if (!state.active || state.paused || state.idx !== i) {
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

  function start() {
    var q = buildQueue();
    if (!q.length) {
      return;
    }
    state.queue = q;
    state.idx = 0;
    state.active = true;
    state.paused = false;
    state.hinted = false;
    document.body.classList.add('ra-reading');
    setLabel('朗读中');
    var ctrl = document.getElementById('ra-ctrl');
    if (ctrl) {
      ctrl.hidden = false;
    }
    pickVoice();
    speakAt(0);
  }

  function doPause() {
    state.paused = true;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    setPauseText(true);
    setLabel('已暂停');
  }

  function doResume() {
    if (!state.active) {
      return;
    }
    state.paused = false;
    setPauseText(false);
    setLabel('朗读中');
    speakAt(state.idx);
  }

  function stop() {
    state.active = false;
    state.paused = false;
    state.idx = 0;
    state.utt = null;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    document.body.classList.remove('ra-reading');
    clearHighlight();
    setLabel('朗读本文');
    setPauseText(false);
    var ctrl = document.getElementById('ra-ctrl');
    if (ctrl) {
      ctrl.hidden = true;
    }
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
