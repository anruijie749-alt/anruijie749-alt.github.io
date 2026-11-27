/* 站内搜索 · 2026-11-27
   纯前端：读取 search-index.json 在本地匹配，不发请求到第三方、不收集任何信息。
   用法：script.js 会自动加载本文件，页面右下角出现放大镜按钮。 */
(function () {
  'use strict';
  if (window.__anrjSearchLoaded) { return; }
  window.__anrjSearchLoaded = true;

  var IDX = null;
  var LOADING = false;
  var FAILED = false;
  var results = [];
  var sel = -1;

  var HOT = [
    { u: 'travel.html', t: 'AI 旅居方案生成' },
    { u: 'health.html', t: '乐龄品质生活指南' },
    { u: 'senior.html', t: '身体叙事馆' },
    { u: 'tools.html', t: 'AI 工具助手' },
    { u: 'weiquan.html', t: '维权助手' },
    { u: 'sitemap.html', t: '全部内容地图' }
  ];

  function ensureStyles() {
    if (document.getElementById('as-style')) { return; }
    var css = [
      '.as-fab{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9996;',
      'width:44px;height:44px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;',
      'color:#7cf6ff;background:rgba(9,20,26,.72);border:1px solid rgba(0,242,254,.35);cursor:pointer;',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 4px 16px rgba(0,0,0,.32);',
      'transition:transform .16s ease,box-shadow .16s ease;}',
      '.as-fab:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,242,254,.26);}',
      '.as-fab:focus-visible{outline:3px solid #00f2fe;outline-offset:3px;}',
      'body.ra-reading .as-fab{display:none;}',
      '.as-mask{position:fixed;inset:0;z-index:10000;background:rgba(2,8,12,.72);display:flex;align-items:flex-start;',
      'justify-content:center;padding:12vh 16px 24px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}',
      '.as-box{width:100%;max-width:600px;background:rgba(12,24,32,.98);border:1px solid rgba(0,242,254,.28);',
      'border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;color:#eafcff;',
      'font-family:inherit;max-height:72vh;display:flex;flex-direction:column;}',
      '.as-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);}',
      '.as-input{flex:1;min-width:0;background:transparent;border:0;outline:none;color:#eafcff;font-size:16px;',
      'font-family:inherit;padding:6px 0;}',
      '.as-input::placeholder{color:#7fa8b3;}',
      '.as-close{width:30px;height:30px;flex:0 0 auto;border-radius:50%;border:0;cursor:pointer;',
      'background:rgba(255,255,255,.08);color:#cdf8ff;font-size:15px;line-height:1;}',
      '.as-list{overflow-y:auto;padding:6px 0 10px;}',
      '.as-item{display:block;padding:12px 16px;text-decoration:none;color:inherit;border-left:3px solid transparent;}',
      '.as-item:hover,.as-item.sel{background:rgba(0,242,254,.10);border-left-color:#00f2fe;}',
      '.as-t{font-size:16px;color:#8ef4ff;font-weight:650;line-height:1.45;}',
      '.as-m{font-size:13px;color:#9db8c2;margin-top:4px;line-height:1.55;}',
      '.as-m em{color:#ffd700;font-style:normal;}',
      '.as-tip{padding:14px 16px 18px;font-size:14px;color:#9fe9f3;line-height:1.75;}',
      '.as-tip a{color:#00f2fe;}',
      '.as-hot{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 16px;}',
      '.as-hot a{font-size:12.5px;padding:6px 10px;border-radius:999px;text-decoration:none;color:#bdf3ff;',
      'background:rgba(0,242,254,.08);border:1px solid rgba(0,242,254,.24);}',
      '.as-head-label{padding:10px 16px 4px;font-size:12.5px;color:#9db8c2;letter-spacing:.03em;}',
      '@media (max-width:600px){',
      '.as-mask{padding:6vh 10px 16px;}',
      '.as-box{max-height:80vh;border-radius:14px;}',
      '.as-fab{right:10px;bottom:calc(70px + env(safe-area-inset-bottom,0px));}',
      '}'
    ].join('');
    var tag = document.createElement('style');
    tag.id = 'as-style';
    tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function loadIndex(cb) {
    if (IDX || FAILED) { cb(); return; }
    if (LOADING) { setTimeout(function () { loadIndex(cb); }, 150); return; }
    LOADING = true;
    var url = 'search-index.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      LOADING = false;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          IDX = JSON.parse(xhr.responseText);
        } catch (e) {
          FAILED = true;
        }
      } else {
        FAILED = true;
      }
      cb();
    };
    xhr.onerror = function () { LOADING = false; FAILED = true; cb(); };
    try { xhr.send(); } catch (e) { LOADING = false; FAILED = true; cb(); }
  }

  function score(item, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var w = terms[i];
      var s = 0;
      if ((item.t || '').indexOf(w) >= 0) { s += 10; }
      if ((item.h || '').indexOf(w) >= 0) { s += 6; }
      if ((item.d || '').indexOf(w) >= 0) { s += 4; }
      if ((item.b || '').indexOf(w) >= 0) { s += 2; }
      if (!s) { return 0; }
      total += s;
    }
    return total;
  }

  function snippet(item, terms) {
    var src = (item.d || '') + ' ' + (item.b || '');
    var at = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = src.indexOf(terms[i]);
      if (p >= 0) { at = p; break; }
    }
    if (at < 0) { at = 0; }
    var start = Math.max(0, at - 20);
    var out = src.slice(start, start + 70);
    if (start > 0) { out = '…' + out; }
    for (var j = 0; j < terms.length; j++) {
      out = out.split(terms[j]).join('<em>' + esc(terms[j]) + '</em>');
    }
    return esc(out).replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>');
  }

  function render(q) {
    var list = document.getElementById('as-list');
    var label = document.getElementById('as-head-label');
    if (!list) { return; }
    list.innerHTML = '';
    results = [];
    sel = -1;

    if (FAILED) {
      label.textContent = '';
      list.innerHTML = '<div class="as-tip">搜索暂时打不开，可以先用<a href="sitemap.html">内容地图</a>按分类找。</div>';
      return;
    }

    var terms = q.replace(/\s+/g, ' ').trim().split(' ').filter(function (x) { return x.length > 0; });
    if (!terms.length) {
      label.textContent = '常用入口';
      list.innerHTML = '<div class="as-hot">' + HOT.map(function (h) {
        return '<a href="' + h.u + '">' + esc(h.t) + '</a>';
      }).join('') + '</div>';
      return;
    }

    var scored = [];
    for (var i = 0; i < (IDX || []).length; i++) {
      var s = score(IDX[i], terms);
      if (s > 0) { scored.push({ s: s, it: IDX[i] }); }
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    scored = scored.slice(0, 10);

    if (!scored.length) {
      label.textContent = '';
      list.innerHTML = '<div class="as-tip">没找到「' + esc(q.trim()) + '」。换个说法试试，比如「旅居 预算」「血压」「维权」。也可以看<a href="sitemap.html">内容地图</a>按分类找。</div>';
      return;
    }

    label.textContent = '找到 ' + scored.length + ' 个页面';
    for (var k = 0; k < scored.length; k++) {
      var it = scored[k].it;
      var a = document.createElement('a');
      a.className = 'as-item';
      a.href = it.u;
      a.innerHTML = '<div class="as-t">' + esc(it.t || it.u) + '</div>' +
        '<div class="as-m">' + esc(it.c || '') + ' · ' + snippet(it, terms) + '</div>';
      list.appendChild(a);
      results.push(a);
    }
  }

  function close() {
    var m = document.getElementById('as-mask');
    if (m && m.parentNode) { m.parentNode.removeChild(m); }
    var b = document.getElementById('as-fab');
    if (b) { b.focus(); }
  }

  function open() {
    ensureStyles();
    if (document.getElementById('as-mask')) { return; }
    var mask = document.createElement('div');
    mask.className = 'as-mask';
    mask.id = 'as-mask';
    mask.innerHTML =
      '<div class="as-box" role="dialog" aria-modal="true" aria-label="站内搜索">' +
        '<div class="as-head">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#7cf6ff" d="M10 2a8 8 0 105.3 14l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>' +
          '<input class="as-input" id="as-input" type="search" autocomplete="off" placeholder="搜内容：旅居、血压、维权、预算…" aria-label="搜索站内内容">' +
          '<button class="as-close" id="as-close" type="button" aria-label="关闭搜索">✕</button>' +
        '</div>' +
        '<div class="as-head-label" id="as-head-label"></div>' +
        '<div class="as-list" id="as-list"></div>' +
      '</div>';
    document.body.appendChild(mask);

    var input = document.getElementById('as-input');
    var list = document.getElementById('as-list');

    mask.addEventListener('click', function (ev) {
      if (ev.target === mask) { close(); }
    });
    document.getElementById('as-close').addEventListener('click', close);

    function doSearch() {
      var q = input.value;
      if (!q.trim()) { render(''); return; }
      loadIndex(function () { render(q); });
    }
    input.addEventListener('input', doSearch);

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { close(); return; }
      if (!results.length) { return; }
      if (ev.key === 'ArrowDown') {
        sel = Math.min(results.length - 1, sel + 1);
      } else if (ev.key === 'ArrowUp') {
        sel = Math.max(0, sel - 1);
      } else if (ev.key === 'Enter') {
        var idx = sel < 0 ? 0 : sel;
        if (results[idx]) { window.location.href = results[idx].getAttribute('href'); }
        return;
      } else {
        return;
      }
      ev.preventDefault();
      for (var i = 0; i < results.length; i++) {
        results[i].classList.toggle('sel', i === sel);
      }
      if (results[sel]) { results[sel].scrollIntoView({ block: 'nearest' }); }
    });

    document.addEventListener('keydown', function onEsc(ev) {
      if (ev.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });

    render('');
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
    loadIndex(function () { if (input.value.trim()) { render(input.value); } });
  }

  function build() {
    ensureStyles();
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'as-fab';
    fab.id = 'as-fab';
    fab.setAttribute('aria-label', '站内搜索');
    fab.title = '站内搜索';
    fab.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 105.3 14l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>';
    fab.addEventListener('click', open);
    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
