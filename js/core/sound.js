(function () {
  'use strict';

  /* Procedural audio for Party Hub: every sound is synthesised with the Web Audio API,
     so there are no audio files and no libraries. Nothing is scheduled until the user has
     made a gesture, and every node is disconnected again as soon as its source ends. */
  const LG = window.LG = window.LG || {};
  const KEY = 'party-hub-liquid-glass:audio:v1';
  const AC = window.AudioContext || window.webkitAudioContext;
  const MIN = 0.0001;
  const MASTER_GAIN = 0.8;
  const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];

  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;
  const live = new Set();
  const buttons = [];

  try { muted = localStorage.getItem(KEY) === 'muted'; } catch (e) { muted = false; }

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const calm = () => !!(mq && mq.matches);
  const jitter = (pct) => 1 + (Math.random() * 2 - 1) * pct;

  /* ----- context lifecycle ----- */
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_GAIN;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state !== 'running' && ctx.state !== 'closed') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(function () { /* wacht op een volgend gebaar */ });
    }
    return ctx;
  }

  // Returns a running context, or null when muted / unsupported / not yet unlocked.
  function guard() {
    if (muted) return null;
    const c = ensure();
    return c && c.state === 'running' ? c : null;
  }

  /* iOS plays Web Audio through the ringer channel, so the silent switch mutes it.
     A (silent) media element, or the audioSession API, moves it to the media channel. */
  let primed = false;
  let keepAlive = null;

  function silentWavUrl() {
    const n = 800;
    const bytes = new Uint8Array(44 + n * 2);
    const dv = new DataView(bytes.buffer);
    const str = function (o, s) { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  }

  function primeMediaChannel() {
    if (primed) return;
    primed = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* niet ondersteund */ }
    try {
      keepAlive = new Audio(silentWavUrl());
      keepAlive.loop = true;
      keepAlive.setAttribute('playsinline', '');
      const p = keepAlive.play();
      if (p && p.catch) p.catch(function () { primed = false; });
    } catch (e) { keepAlive = null; }
  }

  function unlock() {
    ensure();
    primeMediaChannel();
    if (ctx && ctx.state === 'running' && primed) {
      UNLOCK_EVENTS.forEach((ev) => document.removeEventListener(ev, unlock, true));
    }
  }
  UNLOCK_EVENTS.forEach((ev) => document.addEventListener(ev, unlock, true));

  /* ----- node helpers ----- */
  // Disconnects every node once the source has finished, so nothing lingers in the graph.
  function track(src, nodes) {
    live.add(src);
    src.onended = function () {
      live.delete(src);
      nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* al losgekoppeld */ } });
    };
  }

  function stopAll() {
    live.forEach(function (src) { try { src.stop(); } catch (e) { /* al gestopt */ } });
  }

  // One enveloped oscillator: attack to `peak`, then exponential decay to silence at t0 + dur.
  function tone(type, f0, f1, t0, dur, peak, dest, attack) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const a = Math.min(attack == null ? 0.004 : attack, dur / 2);
    g.gain.setValueAtTime(MIN, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    osc.connect(g);
    g.connect(dest || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    track(osc, [osc, g]);
    return { osc: osc, gain: g };
  }

  function noiseSource(t0, dur) {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.start(t0, Math.random() * 0.3, dur);
    return src;
  }

  // Filtered noise with its own gain envelope; `shape(filter, gain)` schedules the automation.
  function noiseBurst(t0, dur, filterType, q, shape, dest) {
    const src = noiseSource(t0, dur);
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = filterType;
    f.Q.value = q;
    src.connect(f);
    f.connect(g);
    g.connect(dest || master);
    shape(f, g);
    track(src, [src, f, g]);
    return src;
  }

  /* ----- public sounds ----- */
  const TAPS = {
    soft: { type: 'sine', f0: 900, f1: 280, peak: 0.22 },
    select: { type: 'triangle', f0: 900, f1: 280, peak: 0.26 },
    heavy: { type: 'triangle', f0: 700, f1: 220, peak: 0.32 }
  };

  // Glass micro-click: 900 Hz -> 280 Hz in 32 ms, with +-4% pitch variation.
  function tap(variant) {
    const c = guard();
    if (!c) return;
    const v = TAPS[variant] || TAPS.soft;
    const k = jitter(0.04);
    tone(v.type, v.f0 * k, v.f1 * k, c.currentTime, 0.032, v.peak, master, 0.002);
  }

  // Frosted-glass whoosh: bandpassed noise sweeping 350 -> 1600 Hz (open) or 1400 -> 300 Hz (close).
  function shutter(open) {
    const c = guard();
    if (!c) return;
    if (calm()) { tap('soft'); return; }
    const t0 = c.currentTime;
    const dur = 0.16;
    const from = open ? 350 : 1400;
    const to = open ? 1600 : 300;
    noiseBurst(t0, dur + 0.02, 'bandpass', 1.4, function (f, g) {
      f.frequency.setValueAtTime(from, t0);
      f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(MIN, t0);
      g.gain.linearRampToValueAtTime(open ? 0.55 : 0.5, t0 + (open ? 0.05 : 0.02));
      g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    });
    if (!open) tone('sine', 1200, 500, t0 + 0.11, 0.03, 0.12, master, 0.002);
  }

  // Deep double thump for countdown timers.
  function heartbeat(urgent) {
    const c = guard();
    if (!c) return;
    const t0 = c.currentTime;
    const gap = urgent ? 0.14 : 0.2;
    const peak = urgent ? 0.95 : 0.65;
    [[t0, peak], [t0 + gap, peak * 0.7]].forEach(function (b) {
      tone('sine', 52, 38, b[0], 0.22, b[1], master, 0.006);
      tone('sine', 104, 76, b[0], 0.12, b[1] * 0.18, master, 0.006); // overtone so phone speakers can hear it
    });
  }

  // 0 - 1400 ms rising tension, then the impact + chime exactly when the role orb lands.
  function eliminationDrama() {
    const c = guard();
    if (!c) return;
    const t0 = c.currentTime + 0.02;
    const hit = t0 + 1.4;

    if (!calm()) {
      [1, 1.007].forEach(function (detune) {
        const osc = c.createOscillator();
        const lp = c.createBiquadFilter();
        const g = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110 * detune, t0);
        osc.frequency.exponentialRampToValueAtTime(480 * detune, hit);
        lp.type = 'lowpass';
        lp.Q.value = 3;
        lp.frequency.setValueAtTime(260, t0);
        lp.frequency.exponentialRampToValueAtTime(2600, hit);
        g.gain.setValueAtTime(MIN, t0);
        g.gain.linearRampToValueAtTime(0.09, hit - 0.02);
        g.gain.linearRampToValueAtTime(MIN, hit + 0.03);
        osc.connect(lp);
        lp.connect(g);
        g.connect(master);
        osc.start(t0);
        osc.stop(hit + 0.06);
        track(osc, [osc, lp, g]);
      });

      noiseBurst(t0, 1.45, 'lowpass', 0.7, function (f, g) {
        f.frequency.setValueAtTime(140, t0);
        g.gain.setValueAtTime(MIN, t0);
        g.gain.linearRampToValueAtTime(0.5, hit - 0.02);
        g.gain.linearRampToValueAtTime(MIN, hit + 0.03);
      });

      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(40, t0);
      sub.frequency.exponentialRampToValueAtTime(62, hit);
      sg.gain.setValueAtTime(MIN, t0);
      sg.gain.linearRampToValueAtTime(0.28, hit - 0.02);
      sg.gain.linearRampToValueAtTime(MIN, hit + 0.03);
      sub.connect(sg);
      sg.connect(master);
      sub.start(t0);
      sub.stop(hit + 0.06);
      track(sub, [sub, sg]);
    }

    // Impact: sub-bass drop 90 -> 28 Hz plus a short noise thud.
    tone('sine', 90, 28, hit, 0.9, 0.95, master, 0.003);
    noiseBurst(hit, 0.26, 'lowpass', 0.8, function (f, g) {
      f.frequency.setValueAtTime(900, hit);
      f.frequency.exponentialRampToValueAtTime(120, hit + 0.25);
      g.gain.setValueAtTime(MIN, hit);
      g.gain.linearRampToValueAtTime(0.45, hit + 0.004);
      g.gain.exponentialRampToValueAtTime(MIN, hit + 0.25);
    });

    // Crystalline chime (E6, B6, E7, B7).
    [[1318.51, 0.16, 1.6], [1975.53, 0.1, 1.3], [2637.02, 0.07, 1.1], [3951.07, 0.04, 0.9]].forEach(function (p, i) {
      tone('sine', p[0], p[0], hit + 0.04 + i * 0.012, p[2], p[1], master, 0.002);
    });
  }

  const CHORDS = {
    civ: { wave: 'triangle', notes: [261.63, 329.63, 392.0, 523.25, 659.25, 783.99], cutoff: 5200, peak: 0.2, step: 0.09, hold: 2.1, sub: 0 },
    jester: { wave: 'triangle', notes: [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66], cutoff: 6000, peak: 0.18, step: 0.07, hold: 1.8, sub: 0 },
    dark: { wave: 'sawtooth', notes: [110, 164.81, 220, 261.63, 329.63, 440], cutoff: 1500, peak: 0.13, step: 0.11, hold: 2.4, sub: 55 }
  };

  // Arpeggiated chord: major voicing for civilians, bright pentatonic for the jester,
  // minor + open fifth for infiltrators and Mr. White.
  function victory(faction) {
    const c = guard();
    if (!c) return;
    const set = faction === 'civ' ? CHORDS.civ : faction === 'jester' ? CHORDS.jester : CHORDS.dark;
    const t0 = c.currentTime + 0.02;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = set.cutoff;
    lp.Q.value = 0.8;
    lp.connect(master);

    let last = null;
    if (set.sub) tone('sine', set.sub, set.sub, t0, set.hold, 0.3, lp, 0.02);
    set.notes.forEach(function (f, i) {
      const start = t0 + i * set.step;
      const wave = set.wave;
      last = tone(wave, f, f, start, set.hold - i * set.step, set.peak, lp, 0.012);
      if (wave === 'sawtooth') tone(wave, f * 1.006, f * 1.006, start, set.hold - i * set.step, set.peak * 0.6, lp, 0.012);
    });
    if (last) {
      const prev = last.osc.onended;
      last.osc.onended = function () {
        if (prev) prev();
        try { lp.disconnect(); } catch (e) { /* al losgekoppeld */ }
      };
    }
  }

  /* ----- mute toggle ----- */
  function paint() {
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', muted ? 'true' : 'false');
      b.setAttribute('aria-label', muted ? 'Geluid aanzetten' : 'Geluid uitzetten');
      const use = b.querySelector('use');
      if (use) use.setAttribute('href', muted ? '#i-sound-off' : '#i-sound');
    });
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? 'muted' : 'on'); } catch (e) { /* privé modus: negeren */ }
    if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.02);
    if (muted) stopAll();
    paint();
  }

  function toggle() {
    setMuted(!muted);
    if (!muted) playTap('select');
  }

  function bind(btn) {
    if (!btn || buttons.indexOf(btn) !== -1) return;
    buttons.push(btn);
    btn.addEventListener('click', toggle);
    paint();
  }

  // UI feedback for every clickable control in the whole app (hub, roster, all games, modals).
  const CLICKABLE = 'button, [role="button"], a[href], summary, label[for], .pill, .step, .vbtn, .btn, .icon-btn, .game-card, .roster-card';
  const FIRM = '.vbtn, .btn-primary, .btn-danger, .game-card';

  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return; // programmatic .click() calls must not make a second sound
    const t = e.target && e.target.closest ? e.target.closest(CLICKABLE) : null;
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    if (buttons.indexOf(t) !== -1) return; // the mute button plays its own confirmation tap
    if (t.closest('.hold-btn')) return;    // hold-to-reveal already plays the shutter sound
    playTap(t.matches(FIRM) ? 'select' : 'soft');
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopAll(); if (keepAlive) keepAlive.pause(); }
    else if (keepAlive && primed) { const p = keepAlive.play(); if (p && p.catch) p.catch(function () { /* wacht op gebaar */ }); }
  });

  // If the context is still suspended (first gesture, or iOS 'interrupted'), resume it first and then
  // play. A sound that would arrive more than 500 ms late is dropped instead of playing out of sync.
  function afterResume(fn) {
    return function () {
      if (muted) return;
      const args = arguments;
      const c = ensure();
      if (!c) return;
      if (c.state === 'running') { fn.apply(null, args); return; }
      const asked = Date.now();
      const p = c.resume();
      if (p && p.then) {
        p.then(function () {
          if (!muted && c.state === 'running' && Date.now() - asked < 500) fn.apply(null, args);
        }).catch(function () { /* geen toestemming */ });
      }
    };
  }

  const playTap = afterResume(tap);

  LG.sound = window.SoundEngine = {
    tap: playTap,
    shutter: afterResume(shutter),
    heartbeat: afterResume(heartbeat),
    eliminationDrama: afterResume(eliminationDrama),
    victory: afterResume(victory),
    stopAll: stopAll,
    toggle: toggle,
    bind: bind,
    isMuted: function () { return muted; }
  };
})();