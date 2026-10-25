(function () {
  'use strict';

  const LG = window.LG;
  const MAX_POINTS = 3000;   // hard cap per stroke so one long scribble can't freeze a phone
  const MIN_STEP = 0.0015;   // normalised distance below which a point is ignored

  /* Neon ink canvas. The game decides WHEN and in WHICH colour drawing is allowed:
     hooks.begin()   -> colour string to allow a new stroke, or null to refuse it
     hooks.end(s)    -> called once with the finished stroke { color, pts:[{x,y}] } (0..1 coordinates)
     hooks.strokes() -> every stroke that must be visible (committed + pending) */
  LG.createInkCanvas = function (wrap, canvas, hooks) {
    const ctx = canvas.getContext('2d');
    let cw = 0, ch = 0;
    let live = null; // the stroke currently under a finger

    function paint(color) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draws only the newest piece while the finger moves (cheap).
    function segment(a, b, color) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x * cw, a.y * ch);
      ctx.lineTo(b.x * cw + 0.01, b.y * ch);
      paint(color);
      ctx.restore();
    }

    // Draws a whole stroke with quadratic smoothing.
    function drawStroke(s) {
      let p = s.pts;
      if (!p.length) return;
      if (p.length === 1) p = [p[0], p[0]];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p[0].x * cw, p[0].y * ch);
      if (p.length === 2) {
        ctx.lineTo(p[1].x * cw + 0.01, p[1].y * ch);
      } else {
        for (let i = 1; i < p.length - 1; i++) {
          ctx.quadraticCurveTo(p[i].x * cw, p[i].y * ch, ((p[i].x + p[i + 1].x) / 2) * cw, ((p[i].y + p[i + 1].y) / 2) * ch);
        }
        const l = p[p.length - 1];
        ctx.lineTo(l.x * cw, l.y * ch);
      }
      paint(s.color);
      ctx.restore();
    }

    function redraw() {
      if (!cw || !ch) return;
      ctx.clearRect(0, 0, cw, ch);
      hooks.strokes().forEach(drawStroke);
      if (live) drawStroke(live);
    }

    function resize() {
      const w = wrap.clientWidth, hh = wrap.clientHeight;
      if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cw = w;
      ch = hh;
      redraw();
    }

    function toPoint(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: LG.clamp((e.clientX - r.left) / r.width, 0, 1), y: LG.clamp((e.clientY - r.top) / r.height, 0, 1) };
    }

    function onDown(e) {
      if (live) return; // a second finger never starts a second stroke
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const color = hooks.begin();
      if (!color) return;
      const pt = toPoint(e);
      if (!pt) return;
      e.preventDefault();
      live = { id: e.pointerId, color: color, pts: [pt] };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* niet ondersteund */ }
      segment(pt, pt, color);
    }

    function onMove(e) {
      if (!live || e.pointerId !== live.id) return;
      e.preventDefault();
      const list = (typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
      list.forEach((ev) => {
        if (live.pts.length >= MAX_POINTS) return;
        const pt = toPoint(ev);
        if (!pt) return;
        const last = live.pts[live.pts.length - 1];
        if (Math.abs(pt.x - last.x) < MIN_STEP && Math.abs(pt.y - last.y) < MIN_STEP) return;
        live.pts.push(pt);
        segment(last, pt, live.color);
      });
    }

    function onUp(e) {
      if (!live || e.pointerId !== live.id) return;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* al losgelaten */ }
      const done = { color: live.color, pts: live.pts };
      live = null;
      hooks.end(done);
      redraw();
    }

    function onCancel(e) {
      if (!live || e.pointerId !== live.id) return;
      live = null;
      redraw();
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(wrap);
    else window.addEventListener('resize', resize);

    return {
      resize: resize,
      redraw: redraw,
      cancelLive() { live = null; },
      snapshot() {
        try { return canvas.toDataURL('image/png'); } catch (err) { return ''; }
      }
    };
  };
})();