import * as THREE from 'three';

/* LaFête WebGL-achtergrond.
   Laag 1: vijf vervormende, gloeiende blobs (IcosahedronGeometry + vertex-noise shader).
   Laag 2: 100 zachte bokeh-deeltjes (THREE.Points met een radiale shader).
   Thema: leest data-theme bij het starten en volgt het 'themechange'-event uit js/core/theme.js. */

// Kleurwaarden blijven sRGB-hex zoals ze zijn; de shaders schrijven ruwe waarden weg.
THREE.ColorManagement.enabled = false;

const CANVAS_ID = 'webgl-bg';
const BLOB_COUNT = 5;
const PARTICLE_COUNT = 100;
const MAX_FRAME_DT = 0.05;
const THEME_LERP_RATE = 2.2;
const PARALLAX_EASE = 3;
const REDUCED_MOTION_SPEED = 0.1;
const MAX_PIXEL_RATIO = 2;
const CAMERA_FOV = 45;
const CAMERA_Z = 6;
const PARTICLE_NEAR_Z = -2;
const PARTICLE_FAR_Z = 1;
const TAU = Math.PI * 2;
const DEFAULT_THEME = 'liquid-glass';

const PALETTES = {
  'liquid-glass': {
    fog: '#030306',
    glow: '#c4b5fd',
    particle: '#c4b5fd',
    blobs: ['#6d28d9', '#0ea5e9', '#a78bfa', '#312e81', '#38bdf8']
  },
  'party-burst': {
    fog: '#07030f',
    glow: '#ff2daa',
    particle: '#ffb020',
    blobs: ['#ff2daa', '#b6ff00', '#8f3dff', '#ffb020', '#22d3ee']
  },
  'blue-sky': {
    fog: '#dbeafe',
    glow: '#ffffff',
    particle: '#ffffff',
    blobs: ['#60a5fa', '#38bdf8', '#93c5fd', '#bfdbfe', '#7dd3fc']
  },
  'deep-space': {
    fog: '#020208',
    glow: '#a5f3fc',
    particle: '#a5f3fc',
    blobs: ['#7c3aed', '#22d3ee', '#312e81', '#6366f1', '#0e7490']
  }
};

const BLOB_VERT = `
uniform float uTime;
uniform float uAmp;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
varying float vDist;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  float x00 = mix(n000, n100, f.x);
  float x10 = mix(n010, n110, f.x);
  float x01 = mix(n001, n101, f.x);
  float x11 = mix(n011, n111, f.x);
  return mix(mix(x00, x10, f.y), mix(x01, x11, f.y), f.z);
}

void main() {
  float n = vnoise(position * 1.4 + vec3(uTime * 0.5));
  float n2 = vnoise(position * 2.6 - vec3(uTime * 0.35, 0.0, uTime * 0.2));
  float disp = (n * 0.7 + n2 * 0.3 - 0.5) * uAmp;
  vec3 p = position + normal * disp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  vNoise = n;
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const BLOB_FRAG = `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform vec3 uFog;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
varying float vDist;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float facing = pow(max(dot(n, v), 0.0), 1.6);
  float glowMix = smoothstep(0.3, 0.7, vNoise) * 0.6;
  vec3 col = mix(uColor, uGlow, glowMix);
  float fogMix = smoothstep(5.0, 11.0, vDist) * 0.5;
  col = mix(col, uFog, fogMix);
  float alpha = facing * 0.3 * (1.0 - fogMix * 0.4);
  gl_FragColor = vec4(col, alpha);
}
`;

const PARTICLE_VERT = `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
}
`;

const PARTICLE_FRAG = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(uColor, a * vAlpha);
}
`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

function init() {
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    });
  } catch (err) {
    // Geen WebGL: de CSS-achtergrond blijft zichtbaar.
    canvas.hidden = true;
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let speedScale = reduceQuery && reduceQuery.matches ? REDUCED_MOTION_SPEED : 1;

  // Uniforms die blobs en deeltjes delen. Thema-overgangen wijzigen alleen deze waarden.
  const shared = {
    uTime: { value: 0 },
    uFog: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uParticleColor: { value: new THREE.Color() }
  };
  const targets = {
    fog: new THREE.Color(),
    glow: new THREE.Color(),
    particle: new THREE.Color(),
    blobs: []
  };
  for (let i = 0; i < BLOB_COUNT; i++) targets.blobs.push(new THREE.Color());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 100);
  camera.position.z = CAMERA_Z;

  // Laag 1: blobs
  const blobGeo = new THREE.IcosahedronGeometry(1, 4);
  const blobs = [];
  for (let i = 0; i < BLOB_COUNT; i++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: BLOB_VERT,
      fragmentShader: BLOB_FRAG,
      uniforms: {
        uTime: shared.uTime,
        uFog: shared.uFog,
        uGlow: shared.uGlow,
        uColor: { value: new THREE.Color() },
        uAmp: { value: 0.35 + (i % 3) * 0.08 }
      },
      transparent: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(blobGeo, mat);
    mesh.scale.setScalar(rand(0.8, 1.25));
    scene.add(mesh);
    blobs.push({
      mesh: mesh,
      mat: mat,
      phase: rand(0, TAU),
      speed: rand(0.08, 0.18),
      radius: rand(1.4, 2.2)
    });
  }

  // Laag 2: bokeh-deeltjes
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const alphas = new Float32Array(PARTICLE_COUNT);
  const speeds = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    sizes[i] = rand(0.05, 0.16);
    alphas[i] = rand(0.25, 0.7);
    speeds[i] = rand(0.12, 0.35);
    phases[i] = rand(0, TAU);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  particleGeo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const particleMat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: {
      uColor: shared.uParticleColor,
      uScale: { value: 1 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Zichtbaar gebied op de verste deeltjes-diepte, met marge.
  const bounds = { x: 3, y: 3 };
  function computeBounds() {
    const dist = CAMERA_Z - PARTICLE_NEAR_Z;
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    bounds.y = halfH + 0.4;
    bounds.x = bounds.y * camera.aspect + 0.4;
  }

  function scatterParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = rand(-bounds.x, bounds.x);
      positions[i3 + 1] = rand(-bounds.y, bounds.y);
      positions[i3 + 2] = rand(PARTICLE_NEAR_Z, PARTICLE_FAR_Z);
    }
    particleGeo.attributes.position.needsUpdate = true;
  }

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    particleMat.uniforms.uScale.value = h * pr * 1.2;
    computeBounds();
  }

  // Thema-palet: bij het starten direct zetten, daarna vloeiend overgaan.
  function setTheme(id, instant) {
    const p = PALETTES[id] || PALETTES[DEFAULT_THEME];
    targets.fog.set(p.fog);
    targets.glow.set(p.glow);
    targets.particle.set(p.particle);
    for (let i = 0; i < BLOB_COUNT; i++) {
      targets.blobs[i].set(p.blobs[i % p.blobs.length]);
    }
    if (instant) {
      shared.uFog.value.copy(targets.fog);
      shared.uGlow.value.copy(targets.glow);
      shared.uParticleColor.value.copy(targets.particle);
      blobs.forEach((b, i) => b.mat.uniforms.uColor.value.copy(targets.blobs[i]));
    }
  }

  function easeTheme(dt) {
    const k = 1 - Math.exp(-THEME_LERP_RATE * dt);
    shared.uFog.value.lerp(targets.fog, k);
    shared.uGlow.value.lerp(targets.glow, k);
    shared.uParticleColor.value.lerp(targets.particle, k);
    blobs.forEach((b, i) => b.mat.uniforms.uColor.value.lerp(targets.blobs[i], k));
  }

  // Muis, gyroscoop en scroll sturen de parallax.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { current: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    pointer.ty = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    pointer.tx = clamp(e.gamma / 30, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  let time = 0;
  let last = 0;
  let rafId = 0;

  function update(dt) {
    const step = dt * speedScale;
    time += step;
    shared.uTime.value = time;
    easeTheme(dt);

    const ease = 1 - Math.exp(-PARALLAX_EASE * dt);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    const scrollTarget = clamp(window.scrollY / Math.max(1, window.innerHeight), 0, 3);
    scroll.current += (scrollTarget - scroll.current) * ease;

    camera.position.x = pointer.x * 0.35;
    camera.position.y = -pointer.y * 0.25 - scroll.current * 0.3;
    camera.lookAt(0, 0, 0);
    particles.position.x = pointer.x * 0.25;
    particles.position.y = -pointer.y * 0.2;

    blobs.forEach((b, i) => {
      const a = time * b.speed + b.phase;
      b.mesh.position.set(
        Math.cos(a) * b.radius,
        Math.sin(a * 1.3 + i) * 0.9,
        -1.2 + Math.sin(a * 0.7) * 0.9
      );
      b.mesh.rotation.y += step * 0.15;
      b.mesh.rotation.x += step * 0.08;
    });

    const arr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      arr[i3 + 1] += speeds[i] * step;
      arr[i3] += Math.sin(time * 0.4 + phases[i]) * 0.12 * step;
      if (arr[i3 + 1] > bounds.y) {
        arr[i3 + 1] = -bounds.y;
        arr[i3] = rand(-bounds.x, bounds.x);
      }
      if (arr[i3] > bounds.x) arr[i3] = -bounds.x;
      if (arr[i3] < -bounds.x) arr[i3] = bounds.x;
    }
    particleGeo.attributes.position.needsUpdate = true;
  }

  // De loop stopt volledig zolang het tabblad verborgen is.
  function frame(now) {
    rafId = 0;
    const dt = clamp((now - last) / 1000, 0, MAX_FRAME_DT);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (!document.hidden) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId || document.hidden) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('themechange', (e) => setTheme(e.detail, false));
  if (reduceQuery && reduceQuery.addEventListener) {
    reduceQuery.addEventListener('change', (e) => {
      speedScale = e.matches ? REDUCED_MOTION_SPEED : 1;
    });
  }

  resize();
  scatterParticles();
  setTheme(document.documentElement.getAttribute('data-theme') || DEFAULT_THEME, true);
  start();
}

init();