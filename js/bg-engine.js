import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* LaFête WebGL backdrop.
   Layer 1: full-screen "liquid aurora" shader (domain-warped noise) with tap shockwaves.
   Layer 2: floating iridescent glass objects (MeshPhysicalMaterial + room environment reflections).
            Taps push nearby objects away on a spring and squash them like jelly.
   Layer 3: drifting bokeh plus a sparkle burst at every tap.
   Theme: reads data-theme at start and follows the 'themechange' event from js/core/theme.js.
   While a game is running (html.fx-paused) the scene slows down and renders at a lower frame rate. */

const CANVAS_ID = 'webgl-bg';
const MAX_FRAME_DT = 0.05;
const THEME_LERP_RATE = 2.4;
const PARALLAX_EASE = 2.6;
const REDUCED_MOTION_SPEED = 0.12;
const MAX_PIXEL_RATIO = 1.75;
const CAMERA_FOV = 40;
const CAMERA_Z = 8;
const TAU = Math.PI * 2;
const DEFAULT_THEME = 'liquid-glass';
const BOKEH_COUNT = 70;
const SPARK_COUNT = 160;
const RIPPLES = 4;
const PAUSED_FRAME_MS = 1000 / 24;
const LINEAR = THREE.LinearSRGBColorSpace;

// aurora: [base, c0..c3]; tint: object glass tints; spark: particle colours; lights: two coloured point lights.
const PALETTES = {
  'liquid-glass': {
    base: '#05040e', aurora: ['#3a1a8c', '#0b6f8f', '#a3155f', '#1d3fbf'], intensity: 1,
    tint: ['#a78bfa', '#22d3ee', '#f472b6', '#818cf8', '#2dd4bf', '#e879f9'],
    spark: ['#ffffff', '#c4b5fd', '#67e8f9', '#f0abfc'], lights: ['#ec4899', '#22d3ee']
  },
  'party-burst': {
    base: '#0a0314', aurora: ['#8a0f5c', '#3f6a06', '#5b21b6', '#a14b05'], intensity: 1,
    tint: ['#ff2daa', '#b6ff00', '#a855f7', '#ffb020', '#22d3ee', '#ff5fcf'],
    spark: ['#b6ff00', '#ff2daa', '#ffb020', '#8f3dff'], lights: ['#ff2daa', '#b6ff00']
  },
  'blue-sky': {
    base: '#cfe3ff', aurora: ['#9cc7ff', '#e8f4ff', '#b9c8ff', '#fff2c8'], intensity: 0.85,
    tint: ['#93c5fd', '#ffffff', '#7dd3fc', '#c4b5fd', '#ffffff', '#fde68a'],
    spark: ['#ffffff', '#bfdbfe', '#fde68a', '#ffffff'], lights: ['#60a5fa', '#fde68a']
  },
  'deep-space': {
    base: '#020208', aurora: ['#2a0f63', '#05445a', '#3b0a52', '#0f1d5c'], intensity: 0.75,
    tint: ['#22d3ee', '#8b5cf6', '#6366f1', '#06b6d4', '#c084fc', '#3b82f6'],
    spark: ['#ffffff', '#a5f3fc', '#ddd6fe', '#ffffff'], lights: ['#7c3aed', '#22d3ee']
  }
};

/* ---------- shaders ---------- */
const AURORA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const AURORA_FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform vec3 uBase;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uIntensity;
uniform float uLight;
uniform vec4 uRipples[${RIPPLES}];
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float asp = uRes.x / max(uRes.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);

  // Tap shockwaves: a travelling ring bends the liquid and leaves a chromatic glint.
  float ring = 0.0;
  vec3 chroma = vec3(0.0);
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 2.4) continue;
    vec2 d = (uv - r.xy) * vec2(asp, 1.0);
    float dist = length(d);
    float rad = age * 0.62;
    float fade = (1.0 - age / 2.4) * r.w;
    float w = exp(-pow((dist - rad) * 13.0, 2.0)) * fade;
    p += (d / max(dist, 0.001)) * w * 0.05;
    ring += w;
    chroma += vec3(
      exp(-pow((dist - rad * 1.04) * 15.0, 2.0)),
      exp(-pow((dist - rad) * 15.0, 2.0)),
      exp(-pow((dist - rad * 0.96) * 15.0, 2.0))) * fade;
  }

  float t = uTime * 0.045;
  vec2 q = vec2(fbm(p * 1.15 + t), fbm(p * 1.15 - t + 3.1));
  vec2 r2 = vec2(fbm(p * 1.4 + q * 1.9 + vec2(1.7, 9.2) + t * 1.3),
                 fbm(p * 1.4 + q * 1.9 + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.25 + r2 * 1.7);

  vec3 col = uBase;
  col = mix(col, uC0, smoothstep(0.2, 0.85, f) * 0.95 * uIntensity);
  col = mix(col, uC1, smoothstep(0.35, 0.95, length(q)) * 0.7 * uIntensity);
  col = mix(col, uC2, smoothstep(0.5, 0.95, r2.x) * 0.6 * uIntensity);
  col = mix(col, uC3, smoothstep(0.55, 1.0, r2.y * f * 1.7) * 0.55 * uIntensity);

  // Silky caustic highlights along the folds of the noise.
  float fold = abs(fract(f * 4.0 + t * 2.0) - 0.5);
  col += smoothstep(0.12, 0.0, fold) * 0.022 * uIntensity * mix(vec3(1.0), uC1 * 2.0, 0.5);

  // Soft light that follows the pointer.
  vec2 pd = (uv - uPointer) * vec2(asp, 1.0);
  col += mix(uC1, vec3(1.0), 0.4) * exp(-dot(pd, pd) * 5.0) * 0.08;

  // Vignette towards the base colour.
  float vig = smoothstep(1.3, 0.25, length(p * vec2(0.85, 1.0)));
  col = mix(uBase, col, mix(0.5, 1.0, vig));

  col += chroma * mix(0.22, 0.12, uLight);
  col += ring * 0.05;

  // Dither against banding.
  col += (hash(uv * uRes + fract(uTime)) - 0.5) / 160.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const POINT_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
  vColor = aColor;
}
`;

const POINT_FRAG = `
uniform float uStar;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  // Four-point star flare for sparkles.
  float cross = max(smoothstep(0.08, 0.0, abs(c.x)) , smoothstep(0.08, 0.0, abs(c.y))) * smoothstep(0.5, 0.0, d);
  a = max(a, cross * uStar);
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

/* ---------- helpers ---------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
// Shader colours are written raw, so keep the sRGB hex values untouched.
const rawColor = (hex) => new THREE.Color().setStyle(hex, LINEAR);

// Anchors in view units: x/y as a fraction of the visible half-size at that depth, z depth, s scale.
const SHAPES = [
  { kind: 'torus', ax: -0.82, ay: 0.7, z: -0.8, s: 0.72 },
  { kind: 'dice', ax: 0.9, ay: 0.36, z: -1.8, s: 0.66 },
  { kind: 'bubble', ax: -0.95, ay: -0.2, z: -2.4, s: 0.72 },
  { kind: 'knot', ax: 0.86, ay: -0.6, z: -0.6, s: 0.66 },
  { kind: 'capsule', ax: -0.5, ay: -0.9, z: -0.2, s: 0.62 },
  { kind: 'gem', ax: 0.55, ay: 0.98, z: -3, s: 0.66 }
];

function makeGeometry(kind) {
  switch (kind) {
    case 'torus': return new THREE.TorusGeometry(0.62, 0.26, 40, 96);
    case 'dice': return new RoundedBoxGeometry(1, 1, 1, 6, 0.24);
    case 'bubble': return new THREE.SphereGeometry(0.62, 64, 40);
    case 'knot': return new THREE.TorusKnotGeometry(0.42, 0.15, 180, 24);
    case 'capsule': return new THREE.CapsuleGeometry(0.3, 0.7, 12, 32);
    default: return new THREE.IcosahedronGeometry(0.66, 0);
  }
}

function init() {
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    // No WebGL: the CSS backdrop stays visible.
    canvas.hidden = true;
    return;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.documentElement.classList.add('has-webgl');

  const root = document.documentElement;
  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let speedScale = reduceQuery && reduceQuery.matches ? REDUCED_MOTION_SPEED : 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 100);
  camera.position.z = CAMERA_Z;

  // Reflections: a neutral studio room, prefiltered once.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const lightA = new THREE.PointLight(0xffffff, 40, 0, 2);
  lightA.position.set(-3.5, 3.5, 4);
  const lightB = new THREE.PointLight(0xffffff, 30, 0, 2);
  lightB.position.set(3.5, -2.5, 3);
  scene.add(lightA, lightB);

  /* ----- layer 1: aurora ----- */
  const ripples = [];
  for (let i = 0; i < RIPPLES; i++) ripples.push(new THREE.Vector4(0, 0, -10, 0));
  const aurora = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uBase: { value: new THREE.Color() },
    uC0: { value: new THREE.Color() },
    uC1: { value: new THREE.Color() },
    uC2: { value: new THREE.Color() },
    uC3: { value: new THREE.Color() },
    uIntensity: { value: 1 },
    uLight: { value: 0 },
    uRipples: { value: ripples }
  };
  const auroraMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, uniforms: aurora, depthTest: false, depthWrite: false })
  );
  auroraMesh.frustumCulled = false;
  auroraMesh.renderOrder = -10;
  scene.add(auroraMesh);
  let rippleIndex = 0;

  /* ----- layer 2: glass objects ----- */
  const objects = SHAPES.map((def, i) => {
    const geo = makeGeometry(def.kind);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      iridescence: 1,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [140, 680],
      sheen: 0.25,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0xffffff),
      envMapIntensity: 1.35,
      transparent: true,
      opacity: 0.78,
      flatShading: def.kind === 'gem'
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(def.s);
    scene.add(mesh);
    return {
      def: def, mesh: mesh, mat: mat,
      tint: new THREE.Color(),
      phase: rand(0, TAU), bob: rand(0.25, 0.45), spin: new THREE.Vector3(rand(-0.25, 0.25), rand(0.15, 0.35), rand(-0.12, 0.12)),
      off: new THREE.Vector3(), vel: new THREE.Vector3(), spinBoost: new THREE.Vector3(), squash: 0, squashV: 0,
      anchor: new THREE.Vector3(), index: i
    };
  });

  /* ----- layer 3: bokeh + sparkles ----- */
  function makePoints(count, star) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uScale: { value: 1 }, uStar: { value: star } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    scene.add(pts);
    return { geo: geo, mat: mat, pts: pts };
  }

  const bokeh = makePoints(BOKEH_COUNT, 0);
  const bokehSpeed = new Float32Array(BOKEH_COUNT);
  const bokehPhase = new Float32Array(BOKEH_COUNT);
  const bokehBase = new Float32Array(BOKEH_COUNT);
  for (let i = 0; i < BOKEH_COUNT; i++) {
    bokeh.geo.attributes.aSize.array[i] = rand(0.05, 0.17);
    bokehBase[i] = rand(0.18, 0.6);
    bokehSpeed[i] = rand(0.1, 0.3);
    bokehPhase[i] = rand(0, TAU);
  }

  const spark = makePoints(SPARK_COUNT, 1);
  const sparkVel = new Float32Array(SPARK_COUNT * 3);
  const sparkLife = new Float32Array(SPARK_COUNT);
  const sparkMax = new Float32Array(SPARK_COUNT);
  let sparkCursor = 0;

  /* ----- theme ----- */
  let palette = PALETTES[DEFAULT_THEME];
  const auroraTarget = { base: new THREE.Color(), c: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()], intensity: 1, light: 0 };
  const lightTarget = [new THREE.Color(), new THREE.Color()];

  function paintBokeh() {
    const col = bokeh.geo.attributes.aColor.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const c = rawColor(palette.spark[i % palette.spark.length]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    bokeh.geo.attributes.aColor.needsUpdate = true;
  }

  function setTheme(id, instant) {
    palette = PALETTES[id] || PALETTES[DEFAULT_THEME];
    auroraTarget.base.copy(rawColor(palette.base));
    palette.aurora.forEach((hex, i) => auroraTarget.c[i].copy(rawColor(hex)));
    auroraTarget.intensity = palette.intensity;
    auroraTarget.light = id === 'blue-sky' ? 1 : 0;
    lightTarget[0].set(palette.lights[0]);
    lightTarget[1].set(palette.lights[1]);
    objects.forEach((o, i) => {
      o.tint.set(palette.tint[i % palette.tint.length]);
    });
    paintBokeh();
    if (instant) {
      aurora.uBase.value.copy(auroraTarget.base);
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => aurora[k].value.copy(auroraTarget.c[i]));
      aurora.uIntensity.value = auroraTarget.intensity;
      aurora.uLight.value = auroraTarget.light;
      lightA.color.copy(lightTarget[0]);
      lightB.color.copy(lightTarget[1]);
      objects.forEach((o) => {
        o.mat.color.copy(o.tint);
      });
    }
  }

  function easeTheme(dt) {
    const k = 1 - Math.exp(-THEME_LERP_RATE * dt);
    aurora.uBase.value.lerp(auroraTarget.base, k);
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((key, i) => aurora[key].value.lerp(auroraTarget.c[i], k));
    aurora.uIntensity.value += (auroraTarget.intensity - aurora.uIntensity.value) * k;
    aurora.uLight.value += (auroraTarget.light - aurora.uLight.value) * k;
    lightA.color.lerp(lightTarget[0], k);
    lightB.color.lerp(lightTarget[1], k);
    objects.forEach((o) => {
      o.mat.color.lerp(o.tint, k);
    });
  }

  /* ----- layout ----- */
  const view = { w: 1, h: 1 };
  function halfSizeAt(z) {
    const dist = CAMERA_Z - z;
    const hh = dist * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    return { x: hh * camera.aspect, y: hh };
  }

  function layoutObjects() {
    const portrait = camera.aspect < 1;
    objects.forEach((o) => {
      const hs = halfSizeAt(o.def.z);
      // On wide screens the objects spread out horizontally instead of hugging the edges.
      const ax = portrait ? o.def.ax : o.def.ax * 0.82;
      o.anchor.set(ax * hs.x, o.def.ay * hs.y * (portrait ? 1 : 0.85), o.def.z);
      const s = o.def.s * (portrait ? 1 : clamp(camera.aspect * 0.75, 1, 1.5));
      o.mesh.scale.setScalar(s);
    });
  }

  function scatterBokeh() {
    const pos = bokeh.geo.attributes.position.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const z = rand(-3, 1.5);
      const hs = halfSizeAt(z);
      pos[i * 3] = rand(-hs.x, hs.x);
      pos[i * 3 + 1] = rand(-hs.y, hs.y);
      pos[i * 3 + 2] = z;
    }
    bokeh.geo.attributes.position.needsUpdate = true;
  }

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    view.w = w; view.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    aurora.uRes.value.set(w * pr, h * pr);
    bokeh.mat.uniforms.uScale.value = h * pr * 1.1;
    spark.mat.uniforms.uScale.value = h * pr * 1.1;
    layoutObjects();
  }

  /* ----- input ----- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / Math.max(1, view.w)) * 2 - 1;
    pointer.ty = (e.clientY / Math.max(1, view.h)) * 2 - 1;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    pointer.tx = clamp(e.gamma / 30, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  const tmpV = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  // A tap sends a shockwave through the aurora, a sparkle burst and a push to nearby objects.
  function tap(clientX, clientY, strength) {
    if (speedScale < 1) strength *= 0.4;
    const u = clientX / view.w;
    const v = 1 - clientY / view.h;
    ripples[rippleIndex].set(u, v, aurora.uTime.value, strength);
    rippleIndex = (rippleIndex + 1) % RIPPLES;

    // Tap point on the z = 0 plane.
    tmpV.set(u * 2 - 1, v * 2 - 1, 0.5).unproject(camera);
    tmpDir.copy(tmpV).sub(camera.position).normalize();
    const dist = -camera.position.z / tmpDir.z;
    const hit = camera.position.clone().addScaledVector(tmpDir, dist);

    objects.forEach((o) => {
      tmpV.copy(o.mesh.position).project(camera);
      const sx = (tmpV.x * 0.5 + 0.5) * view.w;
      const sy = (1 - (tmpV.y * 0.5 + 0.5)) * view.h;
      const dx = sx - clientX;
      const dy = sy - clientY;
      const d = Math.hypot(dx, dy);
      const reach = Math.max(view.w, view.h) * 0.45;
      const k = Math.max(0, 1 - d / reach) * strength;
      if (k <= 0) return;
      const len = Math.max(d, 1);
      o.vel.x += (dx / len) * 3.2 * k;
      o.vel.y -= (dy / len) * 3.2 * k;
      o.vel.z += 1.2 * k;
      o.spinBoost.x += rand(-4, 4) * k;
      o.spinBoost.y += rand(-4, 4) * k;
      o.squashV += 6 * k;
    });

    const pos = spark.geo.attributes.position.array;
    const col = spark.geo.attributes.aColor.array;
    const size = spark.geo.attributes.aSize.array;
    const n = Math.round(22 * strength);
    for (let i = 0; i < n; i++) {
      const j = sparkCursor;
      sparkCursor = (sparkCursor + 1) % SPARK_COUNT;
      pos[j * 3] = hit.x; pos[j * 3 + 1] = hit.y; pos[j * 3 + 2] = hit.z;
      const a = rand(0, TAU);
      const sp = rand(0.8, 3.2);
      sparkVel[j * 3] = Math.cos(a) * sp;
      sparkVel[j * 3 + 1] = Math.sin(a) * sp + 0.6;
      sparkVel[j * 3 + 2] = rand(-0.6, 1.2);
      sparkMax[j] = sparkLife[j] = rand(0.55, 1.1);
      size[j] = rand(0.05, 0.13);
      const c = rawColor(palette.spark[i % palette.spark.length]);
      col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
    }
    spark.geo.attributes.aColor.needsUpdate = true;
    spark.geo.attributes.aSize.needsUpdate = true;
  }

  const PRESSABLE = 'button, [role="button"], a[href], .btn, .game-card, .opt, .pill, .vbtn, .step';
  document.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted) return;
    const hitControl = e.target && e.target.closest && e.target.closest(PRESSABLE);
    tap(e.clientX, e.clientY, hitControl ? 1 : 0.6);
  }, { passive: true, capture: true });

  /* ----- simulation ----- */
  let time = 0;
  let last = 0;
  let lastRender = 0;
  let rafId = 0;

  function update(dt) {
    const paused = root.classList.contains('fx-paused');
    const step = dt * speedScale * (paused ? 0.35 : 1);
    time += step;
    aurora.uTime.value += dt * (paused ? 0.5 : 1) * Math.max(speedScale, 0.3);
    easeTheme(dt);

    const ease = 1 - Math.exp(-PARALLAX_EASE * dt);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    aurora.uPointer.value.set(pointer.x * 0.5 + 0.5, 1 - (pointer.y * 0.5 + 0.5));

    camera.position.x = pointer.x * 0.45;
    camera.position.y = -pointer.y * 0.32;
    camera.lookAt(0, 0, 0);

    const damp = Math.exp(-2.6 * dt);
    objects.forEach((o) => {
      const a = time * 0.6 + o.phase;
      // Spring back to the anchor after a push.
      o.vel.addScaledVector(o.off, -9 * dt);
      o.vel.multiplyScalar(damp);
      o.off.addScaledVector(o.vel, dt);
      o.spinBoost.multiplyScalar(Math.exp(-1.6 * dt));
      // Jelly squash on impact.
      o.squashV += -o.squash * 120 * dt;
      o.squashV *= Math.exp(-7 * dt);
      o.squash += o.squashV * dt;

      o.mesh.position.set(
        o.anchor.x + Math.cos(a * 0.7) * 0.12 + o.off.x,
        o.anchor.y + Math.sin(a) * o.bob + o.off.y,
        o.anchor.z + Math.sin(a * 0.5) * 0.25 + o.off.z
      );
      o.mesh.rotation.x += o.spin.x * step + o.spinBoost.x * dt;
      o.mesh.rotation.y += o.spin.y * step + o.spinBoost.y * dt;
      o.mesh.rotation.z += o.spin.z * step;
      const base = o.def.s * (camera.aspect < 1 ? 1 : clamp(camera.aspect * 0.75, 1, 1.5));
      const sq = clamp(o.squash, -0.25, 0.25);
      o.mesh.scale.set(base * (1 + sq), base * (1 - sq), base * (1 + sq * 0.5));
    });

    // Bokeh drifts upward and twinkles.
    const pos = bokeh.geo.attributes.position.array;
    const alpha = bokeh.geo.attributes.aAlpha.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const i3 = i * 3;
      const hs = halfSizeAt(pos[i3 + 2]);
      pos[i3 + 1] += bokehSpeed[i] * step;
      pos[i3] += Math.sin(time * 0.4 + bokehPhase[i]) * 0.1 * step;
      if (pos[i3 + 1] > hs.y + 0.3) { pos[i3 + 1] = -hs.y - 0.3; pos[i3] = rand(-hs.x, hs.x); }
      alpha[i] = bokehBase[i] * (0.6 + 0.4 * Math.sin(time * 1.6 + bokehPhase[i] * 3));
    }
    bokeh.geo.attributes.position.needsUpdate = true;
    bokeh.geo.attributes.aAlpha.needsUpdate = true;

    // Sparkles fly out, slow down and fade.
    const sp = spark.geo.attributes.position.array;
    const sa = spark.geo.attributes.aAlpha.array;
    const sdamp = Math.exp(-3 * dt);
    let live = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (sparkLife[i] <= 0) { if (sa[i] !== 0) { sa[i] = 0; live = true; } continue; }
      live = true;
      sparkLife[i] -= dt;
      const i3 = i * 3;
      sparkVel[i3] *= sdamp; sparkVel[i3 + 1] = sparkVel[i3 + 1] * sdamp - 1.2 * dt; sparkVel[i3 + 2] *= sdamp;
      sp[i3] += sparkVel[i3] * dt; sp[i3 + 1] += sparkVel[i3 + 1] * dt; sp[i3 + 2] += sparkVel[i3 + 2] * dt;
      const life = Math.max(0, sparkLife[i] / sparkMax[i]);
      sa[i] = life * (0.75 + 0.25 * Math.sin(sparkLife[i] * 40));
    }
    if (live) {
      spark.geo.attributes.position.needsUpdate = true;
      spark.geo.attributes.aAlpha.needsUpdate = true;
    }
  }

  // The loop stops completely while the tab is hidden; in-game it renders at a reduced frame rate.
  function frame(now) {
    rafId = 0;
    const paused = root.classList.contains('fx-paused');
    if (!paused || now - lastRender >= PAUSED_FRAME_MS) {
      const dt = clamp((now - last) / 1000, 0, MAX_FRAME_DT);
      last = now;
      lastRender = now;
      update(dt);
      renderer.render(scene, camera);
    }
    if (!document.hidden) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId || document.hidden) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('themechange', (e) => setTheme(e.detail, false));
  if (reduceQuery && reduceQuery.addEventListener) {
    reduceQuery.addEventListener('change', (e) => { speedScale = e.matches ? REDUCED_MOTION_SPEED : 1; });
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('has-webgl'); });
  canvas.addEventListener('webglcontextrestored', () => root.classList.add('has-webgl'));

  resize();
  scatterBokeh();
  setTheme(root.getAttribute('data-theme') || DEFAULT_THEME, true);
  start();
}

init();
