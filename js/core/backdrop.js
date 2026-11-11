(function () {
  'use strict';

  /* LaFête backdrop director.
     1. Video layer: two muted <video> slots crossfade both between themes and at each loop boundary.
        Until a video can actually play (or when a theme has none, or the file is missing) the CSS/canvas
        scenery of that theme stays visible as a fallback.
     2. Decor layer: transparent Blender renders (PNG/WebP/AVIF) listed in assets/images/decor.json,
        floating at different depths with pointer parallax.
     Both layers live inside .aurora, behind #app, and pause together with the other backdrop animations. */

  const LG = window.LG = window.LG || {};
  const root = document.documentElement;
  const aurora = document.querySelector('.aurora');
  if (!aurora) return;

  const VIDEO_DIR = 'assets/videos/';
  const DECOR_DIR = 'assets/images/';
  const MANIFEST_URL = DECOR_DIR + 'decor.json';
  // Video backgrounds are detached: the Three.js engine (js/bg-engine.js) draws the backdrop.
  // The files stay on disk in assets/videos/ but nothing references them any more.
  const THEME_VIDEOS = {};
  const THEME_FALLBACKS = {
    'liquid-glass': '#080610',
    'blue-sky': '#9acdf5',
    'deep-space': '#030306',
    'party-burst': '#100414'
  };
  const FADE_MS = 1000;       // keep in sync with the opacity transitions in css/backdrop.css
  const LOOP_FADE_SECONDS = 1;
  const PARALLAX_PX = 30;     // pixel travel of a depth-1 item at the screen edge
  const FOLLOW = 0.08;        // easing factor of the parallax follow
  const SETTLE = 0.002;       // stop the parallax loop once it is this close to the target
  const DEFAULTS = { x: 50, y: 50, size: 20, depth: 0.5, rotate: 0, opacity: 1, float: 9 };
  const SAFE_SRC = /^[\w-][\w\-./ ]*\.(?:png|webp|avif)$/i;

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(mq && mq.matches);

  function div(cls) {
    const d = document.createElement('div');
    d.className = cls;
    return d;
  }

  function num(v, fallback, min, max) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  let theme = root.getAttribute('data-theme') || 'liquid-glass';

  /* ===== Video layer ===== */
  const videoLayer = div('bg-video');
  videoLayer.setAttribute('aria-hidden', 'true');
  const slots = [makeSlot(), makeSlot()];
  const failed = new Set();
  let active = -1;
  let token = 0;
  let needsGesture = false;
  let loopTimer = 0;
  let loopReadyCancel = null;
  let looping = false;

  function makeSlot() {
    const el = document.createElement('video');
    el.className = 'bg-video__el';
    // Both the properties and the attributes: dynamically created videos need the properties for autoplay to be allowed.
    el.muted = true;
    el.defaultMuted = true;
    el.loop = false;
    el.autoplay = true;
    el.playsInline = true;
    el.disablePictureInPicture = true;
    el.preload = 'auto';
    el.tabIndex = -1;
    ['muted', 'autoplay', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture', 'aria-hidden'].forEach((a) => {
      el.setAttribute(a, a === 'aria-hidden' ? 'true' : '');
    });
    videoLayer.appendChild(el);
    return { el: el, file: '', cancel: null, ready: false, timer: 0, onTimeUpdate: null };
  }

  function release(slot) {
    if (slot.timer) { clearTimeout(slot.timer); slot.timer = 0; }
    if (slot.cancel) { slot.cancel(); slot.cancel = null; }
    if (slot.onTimeUpdate) {
      slot.el.removeEventListener('timeupdate', slot.onTimeUpdate);
      slot.onTimeUpdate = null;
    }
    slot.el.classList.remove('is-on');
    slot.el.pause();
    slot.el.removeAttribute('src');
    slot.el.load();
    slot.file = '';
    slot.ready = false;
  }

  // Free the decoder of a slot once its fade-out has finished (unless it was reused in the meantime).
  function releaseLater(slot) {
    const file = slot.file;
    if (slot.timer) clearTimeout(slot.timer);
    slot.timer = setTimeout(() => {
      slot.timer = 0;
      if (slot.file === file && !slot.cancel && !slot.el.classList.contains('is-on')) release(slot);
    }, FADE_MS + 100);
  }

  function announce() {
    document.dispatchEvent(new CustomEvent('bgvideochange', { detail: { theme: theme, active: active > -1 } }));
  }

  function syncPlayback() {
    const stop = root.classList.contains('fx-paused') || document.hidden || reduced();
    slots.forEach((s) => {
      if (!s.file) return;
      if (stop || !s.el.classList.contains('is-on')) { s.el.pause(); return; }
      const p = s.el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => { if (err && err.name === 'NotAllowedError') needsGesture = true; });
      }
    });
  }

  function cancelLoopTransition() {
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = 0; }
    if (loopReadyCancel) { loopReadyCancel(); loopReadyCancel = null; }
    looping = false;
    if (active < 0) return;
    const standby = slots[active === 0 ? 1 : 0];
    if (standby.file === slots[active].file) {
      standby.el.classList.remove('is-on');
      standby.el.pause();
      if (standby.ready) standby.el.currentTime = 0;
    }
  }

  function startLoopTransition(slot) {
    if (looping || active < 0 || slots[active] !== slot) return;
    const standby = slots[active === 0 ? 1 : 0];
    if (standby.file !== slot.file || !standby.ready) {
      slot.el.loop = true;
      return;
    }

    looping = true;
    slot.el.loop = false;
    standby.el.loop = false;
    try { standby.el.currentTime = 0; } catch (e) { looping = false; slot.el.loop = true; return; }
    const fade = () => {
      if (!looping || slots[active] !== slot || standby.file !== slot.file) return;
      if (loopReadyCancel) { loopReadyCancel(); loopReadyCancel = null; }
      standby.el.classList.add('is-on');
      if (loopTimer) clearTimeout(loopTimer);
      loopTimer = setTimeout(() => {
        loopTimer = 0;
        if (!looping || slots[active] !== slot || standby.file !== slot.file) return;
        slot.el.classList.remove('is-on');
        slot.el.pause();
        try { slot.el.currentTime = 0; } catch (e) { /* metadata may have been discarded */ }
        active = slots.indexOf(standby);
        looping = false;
      }, FADE_MS);
    };
    let playback;
    try { playback = standby.el.play(); } catch (err) {
      looping = false;
      slot.el.loop = true;
      return;
    }
    const failedPlayback = (err) => {
      if (loopReadyCancel) { loopReadyCancel(); loopReadyCancel = null; }
      looping = false;
      standby.el.classList.remove('is-on');
      standby.el.pause();
      if (err && err.name === 'NotAllowedError') needsGesture = true;
      slot.el.loop = true;
    };
    if (playback && typeof playback.catch === 'function') {
      playback.catch(failedPlayback);
    }
    if (typeof standby.el.requestVideoFrameCallback === 'function') {
      const frameId = standby.el.requestVideoFrameCallback(fade);
      loopReadyCancel = () => {
        if (typeof standby.el.cancelVideoFrameCallback === 'function') standby.el.cancelVideoFrameCallback(frameId);
      };
    } else if (playback && typeof playback.then === 'function') {
      let frameId = 0;
      playback.then(() => { frameId = requestAnimationFrame(fade); }).catch(() => {});
      loopReadyCancel = () => { if (frameId) cancelAnimationFrame(frameId); };
    } else {
      standby.el.addEventListener('playing', fade, { once: true });
      loopReadyCancel = () => standby.el.removeEventListener('playing', fade);
    }
  }

  function prepareSlot(slot, file, ready, failedLoad) {
    release(slot);
    slot.file = file;
    const el = slot.el;
    const done = () => {
      el.removeEventListener('loadeddata', onReady);
      el.removeEventListener('error', onError);
      slot.cancel = null;
    };
    const onReady = () => {
      done();
      slot.ready = true;
      el.loop = true;
      slot.onTimeUpdate = () => {
        if (active !== slots.indexOf(slot) || looping || slot.el.loop || !Number.isFinite(slot.el.duration)) return;
        if (slot.el.currentTime >= Math.max(0, slot.el.duration - LOOP_FADE_SECONDS)) startLoopTransition(slot);
      };
      el.addEventListener('timeupdate', slot.onTimeUpdate);
      ready();
    };
    const onError = () => {
      done();
      failedLoad();
    };
    slot.cancel = done;
    el.addEventListener('loadeddata', onReady);
    el.addEventListener('error', onError);
    el.src = VIDEO_DIR + file;
    el.load();
  }

  function prepareLoopStandby(slot, file, my) {
    prepareSlot(slot, file, () => {
      if (my !== token || active < 0 || slots[active].file !== file) return;
      slot.el.pause();
      try { slot.el.currentTime = 0; } catch (e) { /* wait for media metadata */ }
      slots[active].el.loop = false;
    }, () => {
      if (my === token) {
        release(slot);
        if (active > -1) slots[active].el.loop = true;
      }
    });
  }

  function hideVideo() {
    cancelLoopTransition();
    active = -1;
    slots.forEach((s) => {
      s.el.classList.remove('is-on');
      if (!s.cancel) releaseLater(s);
    });
    root.classList.remove('bg-video-on');
    announce();
  }

  function showVideo(id) {
    const file = THEME_VIDEOS[id];
    theme = id;
    videoLayer.style.setProperty('--video-fallback', THEME_FALLBACKS[id] || '#030306');
    const cur = active > -1 ? slots[active] : null;
    if (file && !failed.has(file) && cur && cur.file === file) return;

    cancelLoopTransition();
    slots.forEach((s) => {
      if (s.timer) { clearTimeout(s.timer); s.timer = 0; }
    });
    const my = ++token;

    // A newer request replaces any load that is still pending.
    slots.forEach((s) => {
      if (s.cancel && s !== cur) release(s);
    });
    if (!file || failed.has(file)) { hideVideo(); return; }

    const slot = slots[active === 0 ? 1 : 0];
    prepareSlot(slot, file, () => {
      if (my !== token) { release(slot); return; }
      const previous = cur;
      slot.el.classList.add('is-on');
      if (previous) previous.el.classList.remove('is-on');
      active = slots.indexOf(slot);
      root.classList.add('bg-video-on');
      syncPlayback();
      announce();
      if (previous) {
        previous.timer = setTimeout(() => {
          previous.timer = 0;
          if (my !== token || active !== slots.indexOf(slot)) return;
          prepareLoopStandby(previous, file, my);
        }, FADE_MS);
      } else {
        prepareLoopStandby(slots[slot === slots[0] ? 1 : 0], file, my);
      }
    }, () => {
      failed.add(file);
      release(slot);
      if (my === token) hideVideo();
    });
    syncPlayback();
  }

  /* ===== Decor layer (Blender renders with pointer parallax) ===== */
  const decorLayer = div('bg-decor');
  decorLayer.setAttribute('aria-hidden', 'true');
  let manifest = null;
  let currentSet = null;
  let nodes = [];
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let raf = 0;

  function loadManifest() {
    if (!window.fetch) return Promise.resolve({});
    return fetch(MANIFEST_URL)
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => (m && typeof m === 'object' ? m : {}))
      .catch(() => ({}));
  }

  function buildItem(cfg) {
    if (!cfg || typeof cfg.src !== 'string' || !SAFE_SRC.test(cfg.src) || cfg.src.indexOf('..') !== -1) return null;
    const o = {
      x: num(cfg.x, DEFAULTS.x, -20, 120),
      y: num(cfg.y, DEFAULTS.y, -20, 120),
      size: num(cfg.size, DEFAULTS.size, 2, 120),
      depth: num(cfg.depth, DEFAULTS.depth, 0, 1),
      rotate: num(cfg.rotate, DEFAULTS.rotate, -360, 360),
      opacity: num(cfg.opacity, DEFAULTS.opacity, 0, 1),
      float: num(cfg.float, DEFAULTS.float, 3, 60)
    };
    const item = div('bg-decor__item');
    item.style.left = o.x + '%';
    item.style.top = o.y + '%';
    const floater = div('bg-decor__float');
    floater.style.setProperty('--float', o.float + 's');
    floater.style.setProperty('--delay', (-Math.random() * o.float).toFixed(2) + 's');
    const img = new Image();
    img.className = 'bg-decor__img';
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.style.setProperty('--size', String(o.size));
    img.style.setProperty('--rot', o.rotate + 'deg');
    img.style.opacity = String(o.opacity);
    img.addEventListener('error', () => { item.remove(); });
    img.src = DECOR_DIR + encodeURI(cfg.src);
    floater.appendChild(img);
    item.appendChild(floater);
    return { el: item, depth: o.depth };
  }

  function applyParallax() {
    nodes.forEach((n) => {
      if (!n.el.isConnected) return;
      n.el.style.transform = 'translate3d(' + (-eased.x * PARALLAX_PX * n.depth).toFixed(2) + 'px,' +
        (-eased.y * PARALLAX_PX * n.depth).toFixed(2) + 'px,0)';
    });
  }

  function frame() {
    raf = 0;
    if (root.classList.contains('fx-paused') || document.hidden || reduced()) return;
    eased.x += (target.x - eased.x) * FOLLOW;
    eased.y += (target.y - eased.y) * FOLLOW;
    applyParallax();
    if (Math.abs(target.x - eased.x) > SETTLE || Math.abs(target.y - eased.y) > SETTLE) {
      raf = requestAnimationFrame(frame);
    }
  }

  function kick() {
    if (!raf && nodes.length) raf = requestAnimationFrame(frame);
  }

  function renderDecor(id) {
    const list = manifest && Array.isArray(manifest[id]) ? manifest[id] : [];
    const built = list.map(buildItem).filter(Boolean);
    const old = currentSet;
    if (old) {
      old.classList.remove('is-on');
      setTimeout(() => { old.remove(); }, FADE_MS + 100);
    }
    currentSet = null;
    nodes = built;
    if (!built.length) return;
    const set = div('bg-decor__set');
    built.forEach((n) => { set.appendChild(n.el); });
    decorLayer.appendChild(set);
    currentSet = set;
    applyParallax();
    requestAnimationFrame(() => { requestAnimationFrame(() => { set.classList.add('is-on'); }); });
  }

  /* ===== Wiring ===== */
  aurora.insertBefore(videoLayer, aurora.firstChild);
  aurora.insertBefore(decorLayer, aurora.querySelector('.vignette'));

  document.addEventListener('themechange', (e) => {
    theme = e.detail;
    showVideo(theme);
    renderDecor(theme);
  });

  document.addEventListener('pointermove', (e) => {
    if (!e.isPrimary || !nodes.length || reduced()) return;
    target.x = (e.clientX / (window.innerWidth || 1) - 0.5) * 2;
    target.y = (e.clientY / (window.innerHeight || 1) - 0.5) * 2;
    kick();
  }, { passive: true });
  root.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; kick(); });

  // Autoplay can still be refused (data saver, low-power mode): retry on the first gesture.
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => {
    document.addEventListener(ev, () => {
      if (!needsGesture) return;
      needsGesture = false;
      syncPlayback();
    }, { passive: true });
  });

  document.addEventListener('visibilitychange', () => { syncPlayback(); kick(); });
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { syncPlayback(); kick(); });

  // The app pauses its backdrop animations while a game is played (html.fx-paused); the video follows.
  let lastPaused = root.classList.contains('fx-paused');
  new MutationObserver(() => {
    const p = root.classList.contains('fx-paused');
    if (p === lastPaused) return;
    lastPaused = p;
    syncPlayback();
    kick();
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  LG.backdrop = {
    theme: () => theme,
    hasVideo: () => active > -1
  };

  showVideo(theme);
  loadManifest().then((m) => {
    manifest = m;
    renderDecor(theme);
  });
})();