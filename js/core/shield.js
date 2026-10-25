(function () {
  'use strict';

  /* Anti-peeking toolkit for pass-and-play:
     - LG.shield.hold(): a "dead-man's switch". The secret is only visible while a thumb is
       pressing the hold button; the moment it lifts the shutter snaps shut.
     - LG.sysBar(): the audio toggle shown in screen headers. */
  const LG = window.LG = window.LG || {};
  const MIN_VIEW_MS = 600;   // a word must have been on screen this long before the phone may move on
  const EDGE_PX = 28;        // how far a finger may wander off the hold button

  // The motion-sensor option was removed: clean up the old stored preference.
  try { localStorage.removeItem('party-hub-liquid-glass:shield:v1'); } catch (e) { /* privé modus: negeren */ }

  /* ----- hold-to-reveal controller ----- */
  /* o.button   hold button element
     o.root     () => element that wraps the secret (receives .is-open)
     o.minMs    minimum continuous view time before onUnlock fires (default 600)
     o.onLock / o.onUnlock / o.onOpen / o.onClose  optional callbacks */
  function hold(o) {
    const btn = o.button;
    const minMs = o.minMs || MIN_VIEW_MS;
    let armed = false, open = false, unlocked = false;
    let pid = null, unlockTimer = null;

    const rootEl = function () { return typeof o.root === 'function' ? o.root() : o.root; };

    function setShut(shut) {
      const root = rootEl();
      if (!root) return;
      const secret = root.querySelector('.secret') || root;
      secret.classList.toggle('shutter-closed', shut);
      secret.setAttribute('aria-hidden', shut ? 'true' : 'false');
      root.classList.toggle('is-open', !shut);
    }

    function scheduleUnlock() {
      if (unlocked) return;
      LG.cancel(unlockTimer);
      unlockTimer = LG.later(function () {
        if (!open || unlocked) return;
        unlocked = true;
        if (o.onUnlock) o.onUnlock();
      }, minMs);
    }

    function show() {
      if (open || !armed) return;
      open = true;
      btn.classList.add('holding');
      btn.setAttribute('aria-pressed', 'true');
      setShut(false);
      if (LG.sound) LG.sound.shutter(true);
      LG.buzz(12);
      scheduleUnlock();
      if (o.onOpen) o.onOpen();
    }

    // clearReveal(): snap the shutter shut (the CSS transition is 120 ms).
    function clearReveal() {
      if (!open) return;
      open = false;
      LG.cancel(unlockTimer);
      setShut(true);
      btn.classList.remove('holding');
      btn.setAttribute('aria-pressed', 'false');
      if (pid !== null) {
        try { btn.releasePointerCapture(pid); } catch (e) { /* capture al weg */ }
        pid = null;
      }
      if (LG.sound) LG.sound.shutter(false);
      if (o.onClose) o.onClose();
    }

    function arm() {
      clearReveal();
      armed = true;
      unlocked = false;
      setShut(true);
      if (o.onLock) o.onLock();
    }

    function reset() {
      clearReveal();
      armed = false;
      unlocked = false;
      LG.cancel(unlockTimer);
      setShut(true);
      if (o.onLock) o.onLock();
    }

    function onDown(e) {
      if (e.button != null && e.button > 0) return;
      e.preventDefault();
      pid = e.pointerId;
      try { btn.setPointerCapture(pid); } catch (err) { /* niet ondersteund: pointerleave vangt het op */ }
      show();
    }

    function onMove(e) {
      if (!open || e.pointerId !== pid) return;
      const r = btn.getBoundingClientRect();
      if (e.clientX < r.left - EDGE_PX || e.clientX > r.right + EDGE_PX ||
          e.clientY < r.top - EDGE_PX || e.clientY > r.bottom + EDGE_PX) clearReveal();
    }

    function onEnd(e) {
      if (pid === null || e.pointerId === pid) clearReveal();
    }

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onEnd);
    btn.addEventListener('pointercancel', onEnd);
    btn.addEventListener('pointerleave', onEnd);
    btn.addEventListener('lostpointercapture', onEnd);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Keyboard / switch-control users get the same dead-man's switch on Space and Enter.
    btn.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); show(); }
    });
    btn.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') clearReveal();
    });
    btn.addEventListener('blur', clearReveal);
    window.addEventListener('blur', clearReveal);
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearReveal(); });

    return {
      arm: arm,
      reset: reset,
      clearReveal: clearReveal,
      isOpen: function () { return open; },
      isUnlocked: function () { return unlocked; }
    };
  }

  /* ----- header button: audio toggle ----- */
  // `withIds` gives the first (hub) bar the documented id; later bars reuse the same behaviour.
  LG.sysBar = function (withIds) {
    const attrs = { type: 'button', class: 'sys-btn sys-audio glass' };
    if (withIds) attrs.id = 'btnAudioToggle';
    const audio = LG.h('button', attrs, LG.icon('sound'));
    if (LG.sound) LG.sound.bind(audio);
    return LG.h('span', { class: 'sys-bar' }, audio);
  };

  LG.shield = { hold: hold };
})();