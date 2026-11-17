(function () {
  'use strict';

  const LG = window.LG = window.LG || {};
  LG.data = LG.data || {};
  LG.games = [];
  LG.registerGame = function (def) { LG.games.push(def); };

  const NS = 'http://www.w3.org/2000/svg';

  LG.$ = (sel, root) => (root || document).querySelector(sel);
  LG.$$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  // Tiny hyperscript helper: h('div', {class:'x', onclick: fn}, child, [children])
  LG.h = function (tag, props) {
    const el = document.createElement(tag);
    const p = props || {};
    Object.keys(p).forEach((k) => {
      const v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach((c) => {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    }
    return el;
  };

  LG.icon = function (name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  };

  // Unbiased random integer in [0, n)
  LG.rand = function (n) {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / n) * n;
      let x;
      do { window.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return x % n;
    }
    return Math.floor(Math.random() * n);
  };

  LG.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = LG.rand(i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  LG.pick = (arr) => arr[LG.rand(arr.length)];

  LG.toMap = function (arr) {
    const m = Object.create(null);
    arr.forEach((x) => { m[x] = true; });
    return m;
  };

  /* Light haptic tick. Android: a short vibration (never longer than 12 ms).
     iPhone (Safari has no vibrate): toggling a hidden iOS 18 <input switch> plays the system's light tap.
     It only works inside a tap; elsewhere, and on older iOS, nothing happens. */
  let hapticLabel = null;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function iosTick() {
    if (!hapticLabel) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.id = 'lg-haptic';
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');
      hapticLabel = document.createElement('label');
      hapticLabel.htmlFor = 'lg-haptic';
      hapticLabel.setAttribute('aria-hidden', 'true');
      const hide = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
      input.style.cssText = hide;
      hapticLabel.style.cssText = hide;
      document.body.appendChild(input);
      document.body.appendChild(hapticLabel);
    }
    hapticLabel.click();
  }
  LG.buzz = function (p) {
    try {
      if (navigator.vibrate) { navigator.vibrate(Math.min(12, typeof p === 'number' ? p : 8)); return; }
      if (isIOS) iosTick();
    } catch (e) { /* not supported */ }
  };
  LG.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  LG.initial = (name) => (String(name || '').trim().charAt(0) || '?').toUpperCase();
  LG.norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  LG.restart = function (el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  // Shrinks text so the longest word fits on the card.
  LG.fitText = function (el, text, maxSize, availMax) {
    el.textContent = text;
    const lens = String(text).split(/[\s-]+/).map((w) => w.length);
    const longest = Math.max.apply(null, lens.concat([4]));
    const avail = Math.min(window.innerWidth * 0.72, availMax || 300);
    const size = Math.floor(avail / (longest * 0.62));
    el.style.fontSize = LG.clamp(size, 22, maxSize || 56) + 'px';
  };

  // Managed timers: everything scheduled here is cancelled when we go back to the hub.
  const timers = {};
  let nextTimer = 1;
  LG.later = function (fn, ms) {
    const id = nextTimer++;
    timers[id] = setTimeout(() => { delete timers[id]; fn(); }, ms);
    return id;
  };
  LG.cancel = function (id) {
    if (id && timers[id]) { clearTimeout(timers[id]); delete timers[id]; }
  };
  LG.cancelAll = function () {
    Object.keys(timers).forEach((k) => { clearTimeout(timers[k]); delete timers[k]; });
  };
})();