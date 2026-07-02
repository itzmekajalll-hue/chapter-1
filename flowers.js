// js/flowers.js — the flower field, and the twenty glowing flowers that hold a letter each
import * as THREE from 'three';

const FIELD_RADIUS = 165;
const POND_CENTER = new THREE.Vector3(20, 0, -8);
const POND_RADIUS = 15;

// twenty positions, loosely following the camera's path through the valley
export const SPECIAL_POSITIONS = [
  [6, 68], [-8, 48], [14, 30], [-6, 10], [30, -2],
  [10, -20], [-10, -35], [6, -50], [-18, -65], [2, -78],
  [-22, -92], [8, -105], [-14, -118], [4, -132], [-20, -145],
  [2, -158], [-12, -170], [6, -182], [-16, -195], [-4, -208],
];

const KIND_ORDER = ['sunflower', 'tulip', 'rose', 'lavender'];

export function buildFlowerField(scene){
  const meshes = KIND_ORDER.map((kind, idx) => buildFieldInstances(scene, kind, 260 - idx * 20));
  function update(time){
    meshes.forEach(m => { m.material.uniforms.uTime.value = time; });
  }
  return { meshes, update };
}

export function buildSpecialFlowers(scene){
  const flowers = [];
  SPECIAL_POSITIONS.forEach(([x, z], i) => {
    const kind = KIND_ORDER[i % KIND_ORDER.length];
    const hue = 0.5 + Math.random() * 0.3;
    const flower = buildSpecialFlower(kind, i, hue);
    flower.group.position.set(x, 0, z);
    flower.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(flower.group);
    flowers.push(flower);
  });

  function update(time){
    flowers.forEach(f => f.update(time));
  }

  return { flowers, update };
}

/* ============================================================ geometry builders */

function mergeParts(parts){
  const positions = [], normals = [], colors = [];
  const nm = new THREE.Matrix3();
  parts.forEach(({ geometry, matrix, color }) => {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    nm.getNormalMatrix(matrix);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++){
      v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      positions.push(v.x, v.y, v.z);
      if (norm){
        n.fromBufferAttribute(norm, i).applyMatrix3(nm).normalize();
        normals.push(n.x, n.y, n.z);
      } else {
        normals.push(0, 1, 0);
      }
      colors.push(color.r, color.g, color.b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

const STEM_COLOR = new THREE.Color(0x4c7a3a);

function stemPart(height = 0.9){
  const geo = new THREE.CylinderGeometry(0.018, 0.03, height, 5);
  const m = new THREE.Matrix4().makeTranslation(0, height / 2, 0);
  return { geometry: geo, matrix: m, color: STEM_COLOR };
}

function buildFlowerGeometry(kind, headColor){
  const parts = [stemPart(0.85)];
  const c = new THREE.Color(headColor);

  if (kind === 'sunflower'){
    parts.push({ geometry: new THREE.CircleGeometry(0.1, 10), matrix: new THREE.Matrix4().makeRotationX(-Math.PI/2).setPosition(0, 0.92, 0), color: new THREE.Color(0x6b4423) });
    for (let i = 0; i < 10; i++){
      const a = (i / 10) * Math.PI * 2;
      const geo = new THREE.BoxGeometry(0.16, 0.03, 0.06);
      const m = new THREE.Matrix4()
        .makeRotationY(a)
        .multiply(new THREE.Matrix4().makeTranslation(0.14, 0, 0));
      m.premultiply(new THREE.Matrix4().makeTranslation(0, 0.92, 0));
      parts.push({ geometry: geo, matrix: m, color: c });
    }
  } else if (kind === 'tulip'){
    const pts = [
      new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.05, 0.02),
      new THREE.Vector2(0.09, 0.1), new THREE.Vector2(0.075, 0.2),
      new THREE.Vector2(0.1, 0.27),
    ];
    const geo = new THREE.LatheGeometry(pts, 9);
    const m = new THREE.Matrix4().makeTranslation(0, 0.85, 0);
    parts.push({ geometry: geo, matrix: m, color: c });
  } else if (kind === 'rose'){
    const sizes = [0.1, 0.085, 0.07, 0.05];
    sizes.forEach((s, i) => {
      const geo = new THREE.IcosahedronGeometry(s, 0);
      const m = new THREE.Matrix4().makeTranslation((Math.random()-0.5)*0.02, 0.9 + i * 0.055, (Math.random()-0.5)*0.02);
      parts.push({ geometry: geo, matrix: m, color: c.clone().offsetHSL(0, 0, (i - 1.5) * 0.05) });
    });
  } else { // lavender
    for (let i = 0; i < 5; i++){
      const geo = new THREE.ConeGeometry(0.03, 0.16, 5);
      const m = new THREE.Matrix4().makeTranslation((Math.random()-0.5)*0.05, 0.92 + i * 0.09, (Math.random()-0.5)*0.05);
      parts.push({ geometry: geo, matrix: m, color: c.clone().offsetHSL(0, 0, (Math.random()-0.5)*0.06) });
    }
  }

  return mergeParts(parts);
}

const HEAD_COLORS = {
  sunflower: 0xffd23f,
  tulip: [0xe94f5c, 0xf4a13f, 0xf2679a],
  rose: [0xd6415a, 0xf2a6bd, 0xe8768f],
  lavender: [0x8a6bc7, 0x9b7fd4, 0x7a5bb0],
};

function pickColor(kind){
  const c = HEAD_COLORS[kind];
  return Array.isArray(c) ? c[Math.floor(Math.random() * c.length)] : c;
}

/* ============================================================ ambient field */

const SWAY_VERT = `
  uniform float uTime;
  varying vec3 vColor;
  attribute vec3 iTint;
  attribute float iPhase;
  void main(){
    vColor = color * iTint;
    vec3 p = position;
    float h = clamp(p.y, 0.0, 1.4);
    float sway = sin(uTime * 1.1 + iPhase) * 0.06 * pow(h, 2.0);
    p.x += sway;
    p.z += sway * 0.6;
    vec4 world = instanceMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;
const SWAY_FRAG = `
  varying vec3 vColor;
  void main(){ gl_FragColor = vec4(vColor, 1.0); }
`;

function buildFieldInstances(scene, kind, count){
  const geo = buildFlowerGeometry(kind, pickColor(kind));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexColors: true, // lets THREE auto-declare the geometry's baked 'color' attribute
    vertexShader: SWAY_VERT,
    fragmentShader: SWAY_FRAG,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);

  const dummy = new THREE.Object3D();
  const tintArr = new Float32Array(count * 3);
  const phaseArr = new Float32Array(count);
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++){
    const r = 12 + Math.sqrt(Math.random()) * FIELD_RADIUS;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - POND_CENTER.x, z - POND_CENTER.z) < POND_RADIUS + 3){ i--; continue; }

    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.85 + Math.random() * 0.5;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    tint.set(1, 1, 1).offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
    tintArr[i*3] = tint.r; tintArr[i*3+1] = tint.g; tintArr[i*3+2] = tint.b;
    phaseArr[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute('iTint', new THREE.InstancedBufferAttribute(tintArr, 3));
  geo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(phaseArr, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  scene.add(mesh);
  return mesh;
}

/* ============================================================ special glowing flowers */

function glowTexture(){
  const size = 128;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,224,150,0.9)');
  g.addColorStop(1, 'rgba(255,224,150,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
let _glowTex = null;

function buildSpecialFlower(kind, letterIndex, hueShift){
  const group = new THREE.Group();
  const color = new THREE.Color(pickColor(kind)).offsetHSL((hueShift - 0.65) * 0.1, 0, 0);
  const geo = buildFlowerGeometry(kind, color);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.5, metalness: 0.05,
    emissive: new THREE.Color(0xffcf7d), emissiveIntensity: 0.35,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(1.5);
  mesh.castShadow = true;
  group.add(mesh);

  if (!_glowTex) _glowTex = glowTexture();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: _glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(2.2, 2.2, 1);
  sprite.position.y = 1.1;
  group.add(sprite);

  // an oversized invisible hit target — generous tap area for mobile
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 0.8;
  hit.userData.letterIndex = letterIndex;
  hit.userData.isSpecialFlower = true;
  group.add(hit);

  const phase = Math.random() * Math.PI * 2;
  let found = false;

  function update(time){
    group.rotation.y += 0.0015;
    mesh.position.y = Math.sin(time * 0.9 + phase) * 0.04;
    const pulse = 0.35 + Math.sin(time * 1.6 + phase) * 0.15 + (found ? 0.35 : 0);
    mat.emissiveIntensity = pulse;
    sprite.material.opacity = 0.55 + Math.sin(time * 1.6 + phase) * 0.2;
  }
  function markFound(){ found = true; }

  return { group, hit, mesh, update, markFound, letterIndex };
}
