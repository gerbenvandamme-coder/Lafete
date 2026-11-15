import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* LaFête WebGL backdrop: a party night that stays in the background.
   Layer 1: full-screen aurora shader (soft colour pools), with disco light specks thrown by the
            mirror ball, slow stage beams and a gentle glow where you tap.
   Layer 2: a mirror ball (procedural tile texture, real reflections) half outside the frame,
            latex balloons drifting upward on strings near the edges, and tumbling confetti.
            Depth fog sinks everything into the background so it never competes with the UI.
   Each theme picks its own mix (deep space shows no props: the CSS planets are its scenery).
   While a game is running (html.fx-paused) the scene slows down and renders at a lower frame rate. */

const CANVAS_ID = 'webgl-bg';
const MAX_FRAME_DT = 0.05;
const THEME_LERP_RATE = 2.4;
const PARALLAX_EASE = 2;
const REDUCED_MOTION_SPEED = 0.12;
const MAX_PIXEL_RATIO = 1.75;
const CAMERA_FOV = 40;
const CAMERA_Z = 8;
const TAU = Math.PI * 2;
const DEFAULT_THEME = 'liquid-glass';
const BOKEH_COUNT = 40;
const CONFETTI_MAX = 90;
const BALLOON_MAX = 4;
const GLOWS = 3;
const PAUSED_FRAME_MS = 1000 / 24;
const LINEAR = THREE.LinearSRGBColorSpace;

/* base/aurora: shader colours. disco: mirror ball + light specks. beams: stage beams.
   balloons: colours (count = length). confetti: count + colours. */
const PALETTES = {
  'liquid-glass': {
    base: '#07051a', aurora: ['#2b1670', '#0a4f6e', '#6b1450', '#1a2f8f'], intensity: 0.85,
    disco: 1, beams: 0.35,
    balloons: ['#8b5cf6', '#ec4899', '#22d3ee'],
    confetti: 26, confettiColors: ['#f0abfc', '#a5b4fc', '#67e8f9', '#fde68a', '#f9a8d4'],
    bokeh: ['#ffffff', '#c4b5fd', '#67e8f9'], lights: ['#ec4899', '#22d3ee'], fogNear: 9, fogFar: 17
  },
  'party-burst': {
    base: '#0b0316', aurora: ['#6e0b4b', '#2f5206', '#4c1d95', '#7a3a04'], intensity: 1,
    disco: 1, beams: 1,
    balloons: ['#ff2daa', '#b6ff00', '#ffb020', '#8f3dff'],
    confetti: 50, confettiColors: ['#b6ff00', '#ff2daa', '#ffb020', '#8f3dff', '#22d3ee'],
    bokeh: ['#ff2daa', '#b6ff00', '#ffb020'], lights: ['#ff2daa', '#b6ff00'], fogNear: 9, fogFar: 18
  },
  'blue-sky': {
    base: '#cfe3ff', aurora: ['#a8ccff', '#eef7ff', '#c3cffd', '#fff3cf'], intensity: 0.8,
    disco: 0, beams: 0,
    balloons: ['#f472b6', '#60a5fa', '#facc15', '#34d399'],
    confetti: 18, confettiColors: ['#f472b6', '#60a5fa', '#facc15', '#34d399', '#ffffff'],
    bokeh: ['#ffffff', '#ffffff', '#fde68a'], lights: ['#ffffff', '#fde68a'], fogNear: 8, fogFar: 19
  },
  'deep-space': {
    base: '#02020a', aurora: ['#24105a', '#053a4d', '#33084a', '#0d1a52'], intensity: 0.6,
    disco: 0, beams: 0,
    balloons: [],
    confetti: 0, confettiColors: ['#ffffff'],
    bokeh: ['#ffffff', '#a5f3fc', '#ddd6fe'], lights: ['#7c3aed', '#22d3ee'], fogNear: 9, fogFar: 17
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
uniform float uDisco;
uniform float uBeams;
uniform vec2 uBall;
uniform vec4 uGlows[${GLOWS}];
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
  for (int i = 0; i < 4; i++) {
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

  // Large, slow colour pools.
  float t = uTime * 0.03;
  vec2 q = vec2(fbm(p * 0.9 + t), fbm(p * 0.9 - t + 3.1));
  float f = fbm(p * 1.0 + q * 1.4 + vec2(t * 0.6, -t * 0.4));
  vec3 col = uBase;
  col = mix(col, uC0, smoothstep(0.25, 0.8, f) * 0.85 * uIntensity);
  col = mix(col, uC1, smoothstep(0.4, 0.95, q.x) * 0.6 * uIntensity);
  col = mix(col, uC2, smoothstep(0.5, 0.95, q.y * f * 1.8) * 0.5 * uIntensity);
  col = mix(col, uC3, smoothstep(0.55, 0.9, 1.0 - f) * 0.35 * uIntensity);

  // Stage beams sweeping slowly from above.
  if (uBeams > 0.001) {
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      vec2 src = vec2(fi < 0.5 ? -0.35 : 0.35, 0.62) * vec2(asp, 1.0);
      vec2 d = p - src;
      float ang = atan(d.x, -d.y);
      float sweep = sin(uTime * (0.16 + fi * 0.05) + fi * 2.1) * 0.45;
      float beam = exp(-pow((ang - sweep) * 9.0, 2.0)) * smoothstep(1.6, 0.1, length(d));
      col += mix(uC2, uC1, fi) * beam * 0.11 * uBeams;
    }
  }

  // Light specks thrown by the mirror ball, gliding across the room.
  if (uDisco > 0.001) {
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float h1 = hash(vec2(fi, 1.7));
      float h2 = hash(vec2(fi, 9.3));
      float h3 = hash(vec2(fi, 4.1));
      vec2 sp = vec2(fract(h1 - uTime * (0.012 + h2 * 0.012)) * 1.3 - 0.15, 0.08 + h3 * 0.84);
      sp.y += sin(uTime * 0.3 + fi) * 0.01;
      vec2 d = (uv - sp) * vec2(asp, 1.0);
      float r = 0.006 + h2 * 0.01;
      float spot = exp(-dot(d, d) / (r * r));
      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h1 * 2.0) + fi * 3.0);
      vec3 sc = mix(vec3(1.0), mix(uC1, uC2, h3) * 2.2, 0.45);
      col += sc * spot * tw * 0.22 * uDisco;
    }
    // Soft halo around the ball itself.
    vec2 bd = (uv - uBall) * vec2(asp, 1.0);
    col += mix(vec3(1.0), uC1 * 2.0, 0.4) * exp(-dot(bd, bd) * 14.0) * 0.07 * uDisco;
  }

  // Soft light that follows the pointer.
  vec2 pd = (uv - uPointer) * vec2(asp, 1.0);
  col += mix(uC1, vec3(1.0), 0.4) * exp(-dot(pd, pd) * 5.0) * 0.05;

  // A gentle glow where you tap (no rings).
  for (int i = 0; i < ${GLOWS}; i++) {
    vec4 g = uGlows[i];
    float age = uTime - g.z;
    if (g.w <= 0.0 || age < 0.0 || age > 1.4) continue;
    vec2 d = (uv - g.xy) * vec2(asp, 1.0);
    float rad = 0.06 + age * 0.18;
    float fade = 1.0 - age / 1.4;
    col += mix(uC1, vec3(1.0), 0.5) * exp(-dot(d, d) / (rad * rad)) * fade * fade * 0.08 * g.w;
  }

  // Vignette towards the base colour.
  float vig = smoothstep(1.3, 0.25, length(p * vec2(0.85, 1.0)));
  col = mix(uBase, col, mix(0.55, 1.0, vig));

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
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

/* ---------- helpers ---------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
// Shader colours are written raw, so keep the sRGB hex values untouched.
const rawColor = (hex) => new THREE.Color().setStyle(hex, LINEAR);

// Mirror-ball tiles: one cell per sphere quad, random brightness, dark grout.
function makeDiscoTexture(cols, rows) {
  const c = document.createElement('canvas');
  const cw = 16;
  c.width = cols * cw;
  c.height = rows * cw;
  const g = c.getContext('2d');
  g.fillStyle = '#16161e';
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = Math.round(rand(140, 255));
      const warm = Math.random() < 0.12;
      g.fillStyle = 'rgb(' + v + ',' + Math.round(warm ? v * 0.88 : v) + ',' + v + ')';
      g.fillRect(x * cw + 1.5, y * cw + 1.5, cw - 3, cw - 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Balloon silhouette (bottom to top) spun into a lathe.
function makeBalloonGeometry() {
  const pts = [
    [0.0, -1.02], [0.07, -1.0], [0.22, -0.88], [0.42, -0.64], [0.58, -0.34], [0.66, -0.04],
    [0.67, 0.24], [0.61, 0.52], [0.48, 0.76], [0.3, 0.92], [0.12, 0.99], [0.0, 1.0]
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(pts, 48);
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
  renderer.toneMappingExposure = 1.0;
  const root = document.documentElement;
  root.classList.add('has-webgl');

  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let speedScale = reduceQuery && reduceQuery.matches ? REDUCED_MOTION_SPEED : 1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 9, 17);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 100);
  camera.position.z = CAMERA_Z;

  // Reflections: a neutral studio room, prefiltered once.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const lightA = new THREE.PointLight(0xffffff, 30, 0, 2);
  lightA.position.set(-4, 3, 4);
  const lightB = new THREE.PointLight(0xffffff, 24, 0, 2);
  lightB.position.set(4, -2.5, 3);
  scene.add(lightA, lightB);

  /* ----- layer 1: aurora ----- */
  const glows = [];
  for (let i = 0; i < GLOWS; i++) glows.push(new THREE.Vector4(0, 0, -10, 0));
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
    uDisco: { value: 0 },
    uBeams: { value: 0 },
    uBall: { value: new THREE.Vector2(0.85, 0.9) },
    uGlows: { value: glows }
  };
  const auroraMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, uniforms: aurora, depthTest: false, depthWrite: false })
  );
  auroraMesh.frustumCulled = false;
  auroraMesh.renderOrder = -10;
  scene.add(auroraMesh);
  let glowIndex = 0;

  /* ----- layer 2a: mirror ball ----- */
  const BALL_COLS = 36;
  const BALL_ROWS = 18;
  const disco = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1, BALL_COLS, BALL_ROWS),
    new THREE.MeshStandardMaterial({
      map: makeDiscoTexture(BALL_COLS, BALL_ROWS), metalness: 1, roughness: 0.16, flatShading: true, envMapIntensity: 1.6
    })
  );
  ball.rotation.z = 0.18;
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8aa0, metalness: 1, roughness: 0.3 })
  );
  rod.position.y = 4;
  disco.add(ball, rod);
  scene.add(disco);
  const discoState = { presence: 0, target: 0, size: 1 };

  /* ----- layer 2b: balloons ----- */
  const balloonGeo = makeBalloonGeometry();
  const knotGeo = new THREE.ConeGeometry(0.075, 0.12, 14);
  const balloons = [];
  for (let i = 0; i < BALLOON_MAX; i++) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
      sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.9
    });
    const group = new THREE.Group();
    const body = new THREE.Mesh(balloonGeo, mat);
    const knot = new THREE.Mesh(knotGeo, mat);
    knot.position.y = -1.07;
    // A curly string hanging down.
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const s = k / 24;
      pts.push(new THREE.Vector3(Math.sin(s * 9 + i) * 0.06 * s, -1.12 - s * 2.4, Math.cos(s * 7) * 0.03));
    }
    const string = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    group.add(body, knot, string);
    group.visible = false;
    scene.add(group);
    balloons.push({
      group: group, mat: mat, string: string, tint: new THREE.Color(), placed: false,
      x: 0, y: 0, z: rand(-5.5, -3), speed: rand(0.12, 0.2), phase: rand(0, TAU), size: rand(0.42, 0.55),
      vx: 0, vy: 0, presence: 0, target: 0, lane: i
    });
  }

  /* ----- layer 2c: confetti ----- */
  const confetti = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.06, 0.11),
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.45, roughness: 0.35, envMapIntensity: 1.2 }),
    CONFETTI_MAX
  );
  confetti.frustumCulled = false;
  confetti.count = 0;
  scene.add(confetti);
  const conf = [];
  for (let i = 0; i < CONFETTI_MAX; i++) {
    conf.push({
      p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(rand(0, TAU), rand(0, TAU), rand(0, TAU)),
      spin: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-2, 2)), fall: rand(0.18, 0.38), sway: rand(0, TAU), placed: false
    });
    confetti.setColorAt(i, new THREE.Color(0xffffff));
  }
  const dummy = new THREE.Object3D();

  /* ----- layer 3: bokeh ----- */
  const bokehGeo = new THREE.BufferGeometry();
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOKEH_COUNT * 3), 3));
  bokehGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(BOKEH_COUNT), 1));
  bokehGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(BOKEH_COUNT), 1));
  bokehGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(BOKEH_COUNT * 3), 3));
  const bokehMat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uScale: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const bokeh = new THREE.Points(bokehGeo, bokehMat);
  bokeh.frustumCulled = false;
  bokeh.renderOrder = 5;
  scene.add(bokeh);
  const bokehSpeed = new Float32Array(BOKEH_COUNT);
  const bokehPhase = new Float32Array(BOKEH_COUNT);
  const bokehBase = new Float32Array(BOKEH_COUNT);
  for (let i = 0; i < BOKEH_COUNT; i++) {
    bokehGeo.attributes.aSize.array[i] = rand(0.05, 0.14);
    bokehBase[i] = rand(0.12, 0.4);
    bokehSpeed[i] = rand(0.06, 0.18);
    bokehPhase[i] = rand(0, TAU);
  }

  /* ----- layout ----- */
  const view = { w: 1, h: 1 };
  function halfSizeAt(z) {
    const hh = (CAMERA_Z - z) * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    return { x: hh * camera.aspect, y: hh };
  }

  const ballPos = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  function layout() {
    const portrait = camera.aspect < 1;
    const z = -4.5;
    const hs = halfSizeAt(z);
    // Upper-right corner, partly outside the frame.
    ballPos.set(hs.x * (portrait ? 1.02 : 0.86), hs.y * (portrait ? 1.0 : 0.86), z);
    discoState.size = portrait ? 0.9 : 1.1;
    tmpV.copy(ballPos).project(camera);
    aurora.uBall.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
  }

  function placeBalloon(b, fromBottom) {
    const hs = halfSizeAt(b.z);
    const portrait = camera.aspect < 1;
    // Lanes keep balloons near the left/right edges, away from the content column.
    const side = b.lane % 2 === 0 ? -1 : 1;
    const edge = portrait ? rand(0.62, 0.95) : rand(0.5, 0.9);
    b.x = side * edge * hs.x;
    b.y = fromBottom ? -hs.y - 1.6 - rand(0, 2.5) : rand(-hs.y, hs.y);
    b.placed = true;
  }

  function scatterBokeh() {
    const pos = bokehGeo.attributes.position.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const z = rand(-4, 1);
      const hs = halfSizeAt(z);
      pos[i * 3] = rand(-hs.x, hs.x);
      pos[i * 3 + 1] = rand(-hs.y, hs.y);
      pos[i * 3 + 2] = z;
    }
    bokehGeo.attributes.position.needsUpdate = true;
  }

  function spawnConfetti(c, anywhere) {
    const z = rand(-7, -3);
    const hs = halfSizeAt(z);
    c.p.set(rand(-hs.x, hs.x), anywhere ? rand(-hs.y, hs.y) : hs.y + rand(0.2, 1.5), z);
    c.v.set(0, 0, 0);
    c.placed = true;
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
    bokehMat.uniforms.uScale.value = h * pr * 1.1;
    layout();
  }

  /* ----- theme ----- */
  let palette = PALETTES[DEFAULT_THEME];
  const target = {
    base: new THREE.Color(), c: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()],
    intensity: 1, disco: 0, beams: 0
  };
  const lightTarget = [new THREE.Color(), new THREE.Color()];
  const fogTarget = new THREE.Color();

  function setTheme(id, instant) {
    palette = PALETTES[id] || PALETTES[DEFAULT_THEME];
    target.base.copy(rawColor(palette.base));
    palette.aurora.forEach((hex, i) => target.c[i].copy(rawColor(hex)));
    target.intensity = palette.intensity;
    target.disco = palette.disco;
    target.beams = palette.beams;
    discoState.target = palette.disco;
    lightTarget[0].set(palette.lights[0]);
    lightTarget[1].set(palette.lights[1]);
    fogTarget.set(palette.base);
    scene.fog.near = palette.fogNear;
    scene.fog.far = palette.fogFar;

    balloons.forEach((b, i) => {
      const hex = palette.balloons[i];
      b.target = hex ? 1 : 0;
      if (hex) b.tint.set(hex);
      b.string.material.color.set(id === 'blue-sky' ? '#64748b' : '#ffffff');
    });

    confetti.count = palette.confetti;
    const cc = new THREE.Color();
    for (let i = 0; i < CONFETTI_MAX; i++) {
      confetti.setColorAt(i, cc.set(palette.confettiColors[i % palette.confettiColors.length]));
    }
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;

    const col = bokehGeo.attributes.aColor.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const c = rawColor(palette.bokeh[i % palette.bokeh.length]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    bokehGeo.attributes.aColor.needsUpdate = true;

    if (instant) {
      aurora.uBase.value.copy(target.base);
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => aurora[k].value.copy(target.c[i]));
      aurora.uIntensity.value = target.intensity;
      aurora.uDisco.value = target.disco;
      aurora.uBeams.value = target.beams;
      lightA.color.copy(lightTarget[0]);
      lightB.color.copy(lightTarget[1]);
      scene.fog.color.copy(fogTarget);
      discoState.presence = discoState.target;
      balloons.forEach((b) => { b.presence = b.target; b.mat.color.copy(b.tint); });
    }
  }

  function easeTheme(dt) {
    const k = 1 - Math.exp(-THEME_LERP_RATE * dt);
    aurora.uBase.value.lerp(target.base, k);
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((key, i) => aurora[key].value.lerp(target.c[i], k));
    aurora.uIntensity.value += (target.intensity - aurora.uIntensity.value) * k;
    aurora.uDisco.value += (target.disco - aurora.uDisco.value) * k;
    aurora.uBeams.value += (target.beams - aurora.uBeams.value) * k;
    lightA.color.lerp(lightTarget[0], k);
    lightB.color.lerp(lightTarget[1], k);
    scene.fog.color.lerp(fogTarget, k);
    discoState.presence += (discoState.target - discoState.presence) * k;
    balloons.forEach((b) => {
      b.presence += (b.target - b.presence) * k;
      b.mat.color.lerp(b.tint, k);
    });
  }

  /* ----- input ----- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / Math.max(1, view.w)) * 2 - 1;
    pointer.ty = (e.clientY / Math.max(1, view.h)) * 2 - 1;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    pointer.tx = clamp(e.gamma / 35, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 35, -1, 1);
  }, { passive: true });

  function screenDelta(pos, clientX, clientY) {
    tmpV.copy(pos).project(camera);
    const dx = (tmpV.x * 0.5 + 0.5) * view.w - clientX;
    const dy = (1 - (tmpV.y * 0.5 + 0.5)) * view.h - clientY;
    return { dx: dx, dy: dy, d: Math.hypot(dx, dy) };
  }

  // A tap leaves a soft glow and gives nearby balloons and confetti a gentle nudge.
  function tap(clientX, clientY) {
    glows[glowIndex].set(clientX / view.w, 1 - clientY / view.h, aurora.uTime.value, 1);
    glowIndex = (glowIndex + 1) % GLOWS;
    const reach = Math.max(view.w, view.h) * 0.35;
    balloons.forEach((b) => {
      if (b.presence < 0.5) return;
      const s = screenDelta(b.group.position, clientX, clientY);
      const k = Math.max(0, 1 - s.d / reach);
      if (k <= 0) return;
      b.vx += (s.dx / Math.max(s.d, 1)) * 0.9 * k;
      b.vy -= (s.dy / Math.max(s.d, 1)) * 0.9 * k;
    });
    for (let i = 0; i < confetti.count; i++) {
      const c = conf[i];
      const s = screenDelta(c.p, clientX, clientY);
      const k = Math.max(0, 1 - s.d / reach);
      if (k <= 0) continue;
      c.v.x += (s.dx / Math.max(s.d, 1)) * 1.2 * k;
      c.v.y += (-s.dy / Math.max(s.d, 1)) * 1.2 * k + 0.4 * k;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted || speedScale < 1) return;
    tap(e.clientX, e.clientY);
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
    camera.position.x = pointer.x * 0.35;
    camera.position.y = -pointer.y * 0.25;
    camera.lookAt(0, 0, 0);

    // Mirror ball: slow spin, gentle sway on its rod; it lowers in and rises out with the theme.
    disco.visible = discoState.presence > 0.01;
    if (disco.visible) {
      disco.scale.setScalar(discoState.size * discoState.presence);
      ball.rotation.y += step * 0.22;
      disco.rotation.z = Math.sin(time * 0.4) * 0.03;
      disco.position.set(ballPos.x, ballPos.y + (1 - discoState.presence) * 3, ballPos.z);
    }

    // Balloons drift upward near the edges and wrap around.
    const bdamp = Math.exp(-1.5 * dt);
    balloons.forEach((b) => {
      b.group.visible = b.presence > 0.01;
      if (!b.group.visible) return;
      if (!b.placed) placeBalloon(b, false);
      b.vx *= bdamp; b.vy *= bdamp;
      b.x += b.vx * dt;
      b.y += b.speed * step + b.vy * dt;
      const hs = halfSizeAt(b.z);
      if (b.y > hs.y + 1.6) placeBalloon(b, true);
      const sway = Math.sin(time * 0.5 + b.phase);
      b.group.position.set(b.x + sway * 0.18, b.y, b.z);
      b.group.rotation.z = sway * 0.12 - b.vx * 0.15;
      b.group.rotation.y = time * 0.15 + b.phase;
      b.group.scale.setScalar(b.size * b.presence);
    });

    // Confetti tumbles down and sways.
    const cdamp = Math.exp(-1.8 * dt);
    for (let i = 0; i < confetti.count; i++) {
      const c = conf[i];
      if (!c.placed) spawnConfetti(c, true);
      c.v.multiplyScalar(cdamp);
      c.p.x += Math.sin(time * 1.1 + c.sway) * 0.12 * step + c.v.x * dt;
      c.p.y += -c.fall * step + c.v.y * dt;
      c.rot.x += c.spin.x * step;
      c.rot.y += c.spin.y * step;
      c.rot.z += c.spin.z * step;
      const hs = halfSizeAt(c.p.z);
      if (c.p.y < -hs.y - 0.3) spawnConfetti(c, false);
      dummy.position.copy(c.p);
      dummy.rotation.copy(c.rot);
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    }
    if (confetti.count) confetti.instanceMatrix.needsUpdate = true;

    // Bokeh drifts upward and twinkles.
    const pos = bokehGeo.attributes.position.array;
    const alpha = bokehGeo.attributes.aAlpha.array;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      const i3 = i * 3;
      const hs = halfSizeAt(pos[i3 + 2]);
      pos[i3 + 1] += bokehSpeed[i] * step;
      pos[i3] += Math.sin(time * 0.4 + bokehPhase[i]) * 0.08 * step;
      if (pos[i3 + 1] > hs.y + 0.3) { pos[i3 + 1] = -hs.y - 0.3; pos[i3] = rand(-hs.x, hs.x); }
      alpha[i] = bokehBase[i] * (0.6 + 0.4 * Math.sin(time * 1.4 + bokehPhase[i] * 3));
    }
    bokehGeo.attributes.position.needsUpdate = true;
    bokehGeo.attributes.aAlpha.needsUpdate = true;
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
