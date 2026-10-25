(function () {
  'use strict';

  /* Welcome portal (#s-welcome): the LaFête logo is the "play" button, floating in a 3D stage
     (rings, glass cubes, orbs) that tilts with the pointer and sways gently when idle. */

  const LG = window.LG;
  const $ = LG.$, ui = LG.ui;
  const ENTER_MS = 760;
  const tilt = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0 };
  let entering = false;

  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cubeFaces = '<i></i><i></i><i></i><i></i><i></i><i></i>';

  const HTML = `
  <section class="screen" id="s-welcome" aria-label="Welkom bij LaFête">
    <div class="wrap welcome-wrap">
      <header class="welcome-top">
        <button type="button" class="dock-btn glass" id="btnOpenSettings" data-open-settings aria-label="Instellingen openen"><svg class="ic" aria-hidden="true"><use href="#i-settings"/></svg></button>
        <button type="button" class="dock-btn glass" id="btnAudioToggle" aria-label="Geluid uitzetten" aria-pressed="false"><svg class="ic" aria-hidden="true"><use href="#i-sound"/></svg></button>
      </header>
      <div class="portal" id="portal">
        <div class="portal-aura" aria-hidden="true"></div>
        <div class="stage3d" aria-hidden="true">
          <div class="scene">
            <i class="ring3d rg3"></i><i class="ring3d rg1"></i><i class="ring3d rg2"></i>
            <div class="cube3d c1">${cubeFaces}</div>
            <div class="cube3d c2">${cubeFaces}</div>
            <i class="orb3d o1"></i><i class="orb3d o2"></i><i class="orb3d o3"></i><i class="orb3d o4"></i><i class="orb3d o5"></i>
          </div>
        </div>
        <div class="portal-float">
          <button type="button" class="portal-title" id="portalTitle" aria-label="LaFête, tik om te beginnen">
            <span class="pt-stack">
              <span class="pt-layer d3" aria-hidden="true">LaFête</span>
              <span class="pt-layer d2" aria-hidden="true">LaFête</span>
              <span class="pt-layer d1" aria-hidden="true">LaFête</span>
              <span class="pt-text">LaFête</span>
            </span>
          </button>
        </div>
        <i class="portal-ripple" aria-hidden="true"></i><i class="portal-ripple r2" aria-hidden="true"></i><i class="portal-ripple r3" aria-hidden="true"></i>
        <p class="portal-hint" aria-hidden="true">Tik om te beginnen</p>
      </div>
      <div class="welcome-dock">
        <button type="button" class="group-chip glass" id="btnGroupProfiles" data-open-groups aria-label="Groep kiezen"><svg class="ic" aria-hidden="true"><use href="#i-users"/></svg><span class="gchip-name">Groep Kiezen</span></button>
      </div>
    </div>
  </section>`;

  function enter(e) {
    if (entering) return;
    entering = true;
    const screen = $('#s-welcome');
    const portal = $('#portal');
    const pr = portal.getBoundingClientRect();
    const tr = $('#portalTitle').getBoundingClientRect();
    // Ripple starts at the tap; keyboard activation (detail 0) starts at the logo centre.
    const fromTap = !!e && e.detail > 0;
    const px = (fromTap ? e.clientX : tr.left + tr.width / 2) - pr.left;
    const py = (fromTap ? e.clientY : tr.top + tr.height / 2) - pr.top;
    portal.style.setProperty('--px', Math.round(px) + 'px');
    portal.style.setProperty('--py', Math.round(py) + 'px');
    LG.buzz(14);
    screen.classList.add('entering');
    LG.later(() => {
      ui.show('hub');
      LG.later(() => { screen.classList.remove('entering'); entering = false; }, 120);
    }, reducedMotion() ? 0 : ENTER_MS);
  }

  // One rAF loop while the welcome screen is visible: eases towards the pointer tilt and adds an idle sway.
  function frame(now) {
    tilt.raf = 0;
    const screen = $('#s-welcome');
    const portal = $('#portal');
    if (!screen || !portal || !screen.classList.contains('active') || document.hidden) return;
    tilt.cx += (tilt.tx - tilt.cx) * 0.09;
    tilt.cy += (tilt.ty - tilt.cy) * 0.09;
    const ty = tilt.cy + Math.sin(now / 2300) * 6;
    const tx = tilt.cx + Math.cos(now / 3100) * 3;
    portal.style.setProperty('--ty', ty.toFixed(2) + 'deg');
    portal.style.setProperty('--tx', tx.toFixed(2) + 'deg');
    portal.style.setProperty('--sy', (ty * 1.6).toFixed(2) + 'deg');
    portal.style.setProperty('--sx', (tx * 1.6).toFixed(2) + 'deg');
    tilt.raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!tilt.raf && !reducedMotion()) tilt.raf = requestAnimationFrame(frame);
  }

  function bindTilt() {
    const screen = $('#s-welcome');
    screen.addEventListener('pointermove', (e) => {
      if (!e.isPrimary) return;
      const r = screen.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tilt.ty = ((e.clientX - r.left) / r.width - 0.5) * 22;
      tilt.tx = -((e.clientY - r.top) / r.height - 0.5) * 16;
    }, { passive: true });
    ['pointerleave', 'pointerup', 'pointercancel'].forEach((ev) => {
      screen.addEventListener(ev, () => { tilt.tx = 0; tilt.ty = 0; });
    });
    document.addEventListener('screenshow', () => { setTimeout(kick, 0); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  }

  function build() {
    ui.mount(HTML);
    LG.sound.bind($('#btnAudioToggle'));
    $('#portalTitle').addEventListener('click', enter);
    bindTilt();
  }

  LG.welcome = { build: build, show: () => ui.show('welcome') };
})();