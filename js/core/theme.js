(function () {
  'use strict';

  /* LaFête theme engine: 4 visual themes, 3 icon packs, the deep-space starfield and the party bursts.
     Everything that animates in the background is paused while a game is being played. */

  const LG = window.LG;
  const root = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const THEME_KEY = 'lafete:theme:v1';
  const ICON_KEY = 'lafete:icons:v1';
  const CALM_SCREENS = { welcome: 1, hub: 1, roster: 1, scores: 1 };
  const TAPPABLE = 'button, [role="button"], a[href], .btn, .game-card, .roster-card, .opt';
  const MAX_BURSTS = 6;
  const BURST_COLORS = [
    ['#b6ff00', '#ff2daa'], ['#ff2daa', '#8f3dff'], ['#ffb020', '#ff2daa'],
    ['#8f3dff', '#22d3ee'], ['#22d3ee', '#b6ff00']
  ];

  const THEMES = [
    { id: 'liquid-glass', label: 'LIQUID GLASS', swatch: 'sw-liquid', color: '#030306', scheme: 'dark' },
    { id: 'party-burst', label: 'PARTY BURST', swatch: 'sw-party', color: '#07030f', scheme: 'dark' },
    { id: 'blue-sky', label: 'BLAUWE LUCHT', swatch: 'sw-sky', color: '#dbeafe', scheme: 'light' },
    { id: 'deep-space', label: 'DIEPE RUIMTE', swatch: 'sw-space', color: '#020208', scheme: 'dark' }
  ];
  const ICON_PACKS = [
    { id: 'vision-minimal', label: 'MINIMAL' },
    { id: 'neon-glow', label: 'NEON GLOW' },
    { id: 'playful-pop', label: 'PLAYFUL POP' }
  ];

  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function readPref(key, list, fallback) {
    let v = null;
    try { v = localStorage.getItem(key); } catch (e) { v = null; }
    return list.some((x) => x.id === v) ? v : fallback;
  }

  function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* privé modus: negeren */ }
  }

  function setMeta(name, value) {
    const m = document.querySelector('meta[name="' + name + '"]');
    if (m) m.setAttribute('content', value);
  }

  let theme = readPref(THEME_KEY, THEMES, 'liquid-glass');
  let icons = readPref(ICON_KEY, ICON_PACKS, 'vision-minimal');
  let calm = true;

  /* ===== Deep-space starfield (canvas, 3 parallax layers + dust + shooting stars) ===== */
  function createStarfield(canvas, wants) {
    const ctx = canvas.getContext('2d');
    const COLORS = ['#ffffff', '#a5f3fc', '#ddd6fe'];
    const LAYER_R = [[0.45, 0.85], [0.8, 1.2], [1.1, 1.7]];
    const LAYER_V = [[2, 4], [5, 8], [10, 16]];
    const LAYER_A = [0.55, 0.75, 0.95];
    const TAU = Math.PI * 2;
    let vw = 0, vh = 0, stars = [], dust = [], shoot = null;
    let raf = 0, last = 0, clock = 0, nextShoot = 4, running = false, resizeTimer = 0;

    const rnd = (a, b) => a + Math.random() * (b - a);

    function seed() {
      const count = Math.max(90, Math.min(260, Math.round(vw * vh / 5200)));
      stars = [];
      for (let i = 0; i < count; i++) {
        const m = i % 10;
        const layer = m < 6 ? 0 : (m < 9 ? 1 : 2);
        const ci = Math.random() < (layer === 2 ? 0.45 : 0.8) ? 0 : 1 + Math.floor(Math.random() * 2);
        stars.push({
          x: Math.random() * vw, y: Math.random() * vh,
          r: rnd(LAYER_R[layer][0], LAYER_R[layer][1]),
          v: rnd(LAYER_V[layer][0], LAYER_V[layer][1]),
          a: LAYER_A[layer], ci: ci, ph: rnd(0, TAU), tw: rnd(0.7, 2.4)
        });
      }
      dust = [];
      for (let j = 0; j < 28; j++) {
        dust.push({ x: Math.random() * vw, y: Math.random() * vh, r: rnd(0.8, 2), vx: rnd(-9, -3), vy: rnd(-2, 2), a: rnd(0.06, 0.16) });
      }
    }

    function spawnShoot() {
      const ang = rnd(0.35, 0.7);
      shoot = {
        x: rnd(vw * 0.35, vw * 1.05), y: rnd(-10, vh * 0.35),
        ux: -Math.cos(ang), uy: Math.sin(ang), sp: rnd(520, 820), len: rnd(90, 150), life: 1.1
      };
    }

    function step(dt) {
      clock += dt;
      stars.forEach((s) => {
        s.x -= s.v * dt;
        if (s.x < -2) { s.x = vw + 2; s.y = Math.random() * vh; }
      });
      dust.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -4) p.x = vw + 4;
        if (p.y < -4) p.y = vh + 4;
        if (p.y > vh + 4) p.y = -4;
      });
      nextShoot -= dt;
      if (!shoot && nextShoot <= 0) { spawnShoot(); nextShoot = rnd(6, 13); }
      if (shoot) {
        shoot.x += shoot.ux * shoot.sp * dt;
        shoot.y += shoot.uy * shoot.sp * dt;
        shoot.life -= dt;
        if (shoot.life <= 0) shoot = null;
      }
    }

    function render() {
      ctx.clearRect(0, 0, vw, vh);
      ctx.fillStyle = '#c4b5fd';
      dust.forEach((p) => {
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      });
      COLORS.forEach((col, ci) => {
        ctx.fillStyle = col;
        stars.forEach((s) => {
          if (s.ci !== ci) return;
          ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(s.ph + clock * s.tw));
          if (s.r > 1.15) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fill();
          } else {
            ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
          }
        });
      });
      if (shoot) {
        const tx = shoot.x - shoot.ux * shoot.len;
        const ty = shoot.y - shoot.uy * shoot.len;
        const g = ctx.createLinearGradient(tx, ty, shoot.x, shoot.y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,0.95)');
        ctx.globalAlpha = Math.min(1, shoot.life / 0.35);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(shoot.x, shoot.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function resize() {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!running && wants()) render();
    }

    function loop(ts) {
      if (!running) return;
      const dt = Math.max(0, Math.min(0.05, (ts - last) / 1000));
      last = ts;
      step(dt);
      render();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function sync() {
      if (!wants()) { stop(); return; }
      if (reducedMotion.matches) { stop(); render(); return; }
      start();
    }

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    resize();
    return { sync: sync };
  }

  const canvasEl = document.getElementById('starfield');
  const starfield = canvasEl && canvasEl.getContext
    ? createStarfield(canvasEl, () => theme === 'deep-space' && calm && !document.hidden)
    : { sync: function () { /* geen canvas */ } };

  /* ===== Party bursts: coloured light flashes where a button is tapped ===== */
  function initBursts() {
    const layer = LG.h('div', { class: 'burst-layer', 'aria-hidden': 'true' });
    document.body.appendChild(layer);
    let n = 0;
    document.addEventListener('pointerdown', (e) => {
      if (theme !== 'party-burst' || !calm || reducedMotion.matches) return;
      if (!e.target || !e.target.closest || !e.target.closest(TAPPABLE)) return;
      if (layer.children.length >= MAX_BURSTS) return;
      const pal = BURST_COLORS[n++ % BURST_COLORS.length];
      const el = LG.h('i', {
        class: 'burst',
        style: 'left:' + Math.round(e.clientX) + 'px;top:' + Math.round(e.clientY) + 'px;--c1:' + pal[0] + ';--c2:' + pal[1]
      });
      el.addEventListener('animationend', () => { if (el.parentNode) el.parentNode.removeChild(el); });
      layer.appendChild(el);
    }, { passive: true });
  }

  /* ===== Theme + icon state ===== */
  function applyTheme() {
    const t = THEMES.filter((x) => x.id === theme)[0];
    root.setAttribute('data-theme', theme);
    setMeta('theme-color', t.color);
    setMeta('color-scheme', t.scheme);
    starfield.sync();
  }

  function setTheme(id) {
    if (!THEMES.some((t) => t.id === id)) return;
    theme = id;
    writePref(THEME_KEY, id);
    applyTheme();
    document.dispatchEvent(new CustomEvent('themechange', { detail: id }));
  }

  function setCalm(c) {
    calm = c;
    root.classList.toggle('fx-paused', !c);
    starfield.sync();
  }

  /* ===== Game icon packs ===== */
  // a = main stroke, b = accent stroke, fill = silhouette used by playful-pop, dots = [x, y, colour class]
  const GLYPHS = {
    undercover: {
      a: 'M3 8c3-2 6-2.5 9-2.5s6 .5 9 2.5c0 6-3.5 11-9 11S3 14 3 8z',
      b: 'M7.5 12c1-.9 2.3-.9 3.3 0M13.2 12c1-.9 2.3-.9 3.3 0',
      dots: [[20, 4, 'd1'], [4, 20.5, 'd2']]
    },
    saboteur: {
      a: 'M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z',
      b: 'M14.5 6.5l3 3',
      dots: [[20, 19.5, 'd3'], [4.5, 4.5, 'd2']]
    },
    golflengte: {
      a: 'M2 12c2.2-7 4.2-7 5.5 0s3.3 7 5 0 3.3-7 5 0 1.3 3.5 2.5 0',
      b: 'M12 3v3M12 18v3',
      fill: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0z',
      dots: [[20.5, 4.5, 'd1'], [3.5, 20, 'd3']]
    },
    dilemma: {
      a: 'M12 4v16M7 20h10M5 7h14',
      b: 'M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
      fill: 'M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
      dots: [[12, 2.5, 'd1'], [21, 20.5, 'd2']]
    },
    kameleon: {
      a: 'M3 11.5c.5-2.5 2.7-4 5.5-4H14c3 0 5.5 2.3 5.5 5.2 0 2.4-1.8 4.3-4 4.3-1.9 0-3.3-1.3-3.3-3 0-1.3.9-2.2 2-2.2',
      b: 'M9 17v2.5M15 17v2.5',
      dots: [[7, 11, 'd1'], [20.5, 5, 'd3']]
    },
    blackstories: {
      a: 'M5 20V11a7 7 0 0 1 14 0v9l-3-2-2 2-2-2-2 2-2-2z',
      b: 'M9.5 11h.01M14.5 11h.01',
      dots: [[20.5, 4, 'd1'], [3.5, 20.5, 'd2']]
    },
    koffer: {
      a: 'M4 8h16v11H4z',
      b: 'M9 8V5.5h6V8M4 13h16M12 12v2.5',
      dots: [[20.5, 4.5, 'd1'], [3.5, 21, 'd3']]
    },
    blindsync: {
      a: 'M3 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0z',
      b: 'M10 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0z',
      dots: [[12, 3, 'd1'], [12, 21, 'd2']]
    }
  };

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  // Icon resolver: returns an <svg> for a game in the requested icon style.
  function renderGameIcon(gameKey, style) {
    const pack = ICON_PACKS.some((p) => p.id === style) ? style : 'vision-minimal';
    const g = GLYPHS[gameKey];
    if (!g) return LG.icon('star');
    const svg = svgEl('svg', { 'class': 'gi gi-' + pack, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
    if (pack === 'neon-glow') {
      svg.appendChild(svgEl('path', { d: g.a, 'class': 'n-a' }));
      svg.appendChild(svgEl('path', { d: g.b, 'class': 'n-b' }));
    } else if (pack === 'playful-pop') {
      svg.appendChild(svgEl('path', { d: g.fill || g.a, 'class': 'pp-fill' }));
      svg.appendChild(svgEl('path', { d: g.a }));
      svg.appendChild(svgEl('path', { d: g.b }));
      g.dots.forEach((dt) => svg.appendChild(svgEl('circle', { cx: dt[0], cy: dt[1], r: 1.35, 'class': 'pp-dot ' + dt[2] })));
    } else {
      svg.appendChild(svgEl('path', { d: g.a }));
      svg.appendChild(svgEl('path', { d: g.b }));
    }
    return svg;
  }

  // Re-render every game badge currently on screen (cards carry data-game-icon="<game id>").
  function refreshIcons() {
    LG.$$('[data-game-icon]').forEach((el) => {
      el.textContent = '';
      el.appendChild(renderGameIcon(el.getAttribute('data-game-icon'), icons));
    });
  }

  function applyIcons() {
    root.setAttribute('data-icons', icons);
    refreshIcons();
  }

  function setIcons(id) {
    if (!ICON_PACKS.some((p) => p.id === id)) return;
    icons = id;
    writePref(ICON_KEY, id);
    applyIcons();
    document.dispatchEvent(new CustomEvent('iconschange', { detail: id }));
  }

  LG.renderGameIcon = window.renderGameIcon = renderGameIcon;
  LG.theme = { list: THEMES, get: () => theme, set: setTheme };
  LG.icons = { list: ICON_PACKS, get: () => icons, set: setIcons, refresh: refreshIcons };

  document.addEventListener('screenshow', (e) => setCalm(!!CALM_SCREENS[e.detail]));
  document.addEventListener('visibilitychange', () => starfield.sync());

  applyTheme();
  applyIcons();
  initBursts();
})();