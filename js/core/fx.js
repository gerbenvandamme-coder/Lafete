(function () {
  'use strict';

  /* LaFête interaction effects for every control in the app:
     - liquid press: the control sinks towards the finger and springs back with a jelly wobble;
     - 3D tilt + moving glare on cards (fine pointers only);
     - one global light angle (--lg-light) that the chromatic glass rims follow.
     Everything is transform/opacity only, and skipped for reduced motion. */

  const root = document.documentElement;
  const PRESSABLE = 'button, [role="button"], a[href], .btn, .icon-btn, .game-card, .roster-card, .opt, .pill, .step, .vbtn, .strip, .dock-btn, .group-chip';
  const SKIP = '.portal-title, .hold-btn, .switch, input, textarea, select';
  const TILT = '.game-card, .roster-card, .opt';
  const TILT_DEG = 6;

  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };

  let downEl = null;

  function pressable(target) {
    if (!target || !target.closest) return null;
    if (target.closest(SKIP)) return null;
    const el = target.closest(PRESSABLE);
    if (!el || el.disabled) return null;
    return el;
  }

  /* ----- liquid press ----- */
  function release() {
    if (!downEl) return;
    const el = downEl;
    downEl = null;
    el.classList.remove('lg-down');
    el.classList.add('lg-up');
    setTimeout(() => el.classList.remove('lg-up'), 900);
  }

  document.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted || (e.button && e.button !== 0)) return;
    const el = pressable(e.target);
    if (!el) return;
    if (!reduced.matches) {
      const r = el.getBoundingClientRect();
      // The control sinks towards the finger: origin at the opposite side of the tap.
      const ox = clamp01((e.clientX - r.left) / Math.max(1, r.width));
      const oy = clamp01((e.clientY - r.top) / Math.max(1, r.height));
      el.style.setProperty('--lg-ox', (100 - ox * 100).toFixed(1) + '%');
      el.style.setProperty('--lg-oy', (100 - oy * 100).toFixed(1) + '%');
      el.classList.remove('lg-up');
      el.classList.add('lg-down');
      downEl = el;
    }
  }, { capture: true, passive: true });
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', release);

  // Keyboard activation gets the jelly too.
  document.addEventListener('keydown', (e) => {
    if (reduced.matches || (e.key !== 'Enter' && e.key !== ' ')) return;
    const el = pressable(document.activeElement);
    if (!el) return;
    el.style.setProperty('--lg-ox', '50%');
    el.style.setProperty('--lg-oy', '50%');
    el.classList.add('lg-down');
    downEl = el;
  }, true);
  document.addEventListener('keyup', release, true);

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* ----- 3D tilt + glare (mouse / trackpad) ----- */
  let tiltEl = null;
  let tiltFrame = 0;
  let tiltEvt = null;

  function resetTilt(el) {
    if (!el) return;
    el.classList.remove('lg-tilt');
    el.style.removeProperty('rotate');
    el.style.removeProperty('--lg-gx');
    el.style.removeProperty('--lg-gy');
  }

  function applyTilt() {
    tiltFrame = 0;
    const e = tiltEvt;
    if (!e) return;
    const el = e.target && e.target.closest ? e.target.closest(TILT) : null;
    if (el !== tiltEl) { resetTilt(tiltEl); tiltEl = el; }
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const r = el.getBoundingClientRect();
    const nx = clamp01((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    const ny = clamp01((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
    const ang = Math.min(1, Math.hypot(nx, ny)) * TILT_DEG;
    el.classList.add('lg-tilt');
    el.style.rotate = (-ny).toFixed(3) + ' ' + nx.toFixed(3) + ' 0 ' + ang.toFixed(2) + 'deg';
    el.style.setProperty('--lg-gx', ((nx + 1) * 50).toFixed(1) + '%');
    el.style.setProperty('--lg-gy', ((ny + 1) * 50).toFixed(1) + '%');
  }

  /* ----- global light angle for the chromatic rims ----- */
  let lightFrame = 0;
  let lightEvt = null;
  function applyLight() {
    lightFrame = 0;
    const e = lightEvt;
    if (!e) return;
    const ang = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2) * 180 / Math.PI + 90;
    root.style.setProperty('--lg-light', ang.toFixed(1) + 'deg');
  }

  document.addEventListener('pointermove', (e) => {
    if (reduced.matches) return;
    lightEvt = e;
    if (!lightFrame) lightFrame = requestAnimationFrame(applyLight);
    if (e.pointerType !== 'mouse' && !finePointer.matches) return;
    tiltEvt = e;
    if (!tiltFrame) tiltFrame = requestAnimationFrame(applyTilt);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { resetTilt(tiltEl); tiltEl = null; });
  document.addEventListener('screenshow', () => { resetTilt(tiltEl); tiltEl = null; });

  // Phones: tilting the device moves the light across the glass.
  window.addEventListener('deviceorientation', (e) => {
    if (reduced.matches || e.gamma == null) return;
    root.style.setProperty('--lg-light', (180 + e.gamma * 3).toFixed(1) + 'deg');
  }, { passive: true });
})();
