// js/world.js — the flower valley itself: ground, water, wood, blossom and sky
import * as THREE from 'three';

const GRASS_COUNT = 5200;
const PETAL_COUNT = 260;
const FIELD_RADIUS = 170;
const POND_CENTER = new THREE.Vector3(20, 0, -8);
const POND_RADIUS = 15;
const TREE_END = new THREE.Vector3(-9, 0, -224);

export function buildWorld(scene){
  const ground = buildGround(scene);
  const grass = buildGrass(scene);
  const pond = buildPond(scene);
  const bridge = buildBridge(scene);
  const trees = buildCherryTrees(scene);
  const clouds = buildClouds(scene);
  const birds = buildBirds(scene);
  const petals = buildPetals(scene);
  const endingTree = buildEndingTree(scene);

  function update(time, delta){
    grass.material.uniforms.uTime.value = time;
    pond.material.uniforms.uTime.value = time;
    updateClouds(clouds, delta);
    updateBirds(birds, time);
    updatePetals(petals, time, delta);
    endingTree.update(time);
  }

  return { ground, grass, pond, bridge, trees, clouds, birds, petals, endingTree, update, POND_CENTER, POND_RADIUS, TREE_END };
}

/* ---------------------------------------------------------------- ground */
function buildGround(scene){
  const geo = new THREE.CircleGeometry(FIELD_RADIUS * 1.7, 96);
  geo.rotateX(-Math.PI / 2);

  // gentle vertex-color variation so the meadow doesn't read as one flat green
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(0x8fae6a);
  const alt = new THREE.Color(0x9fbb74);
  for (let i = 0; i < pos.count; i++){
    const n = (Math.sin(pos.getX(i) * 0.05) + Math.cos(pos.getZ(i) * 0.05)) * 0.5;
    const c = base.clone().lerp(alt, (n + 1) / 2);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0;
  scene.add(mesh);
  return mesh;
}

/* ---------------------------------------------------------------- grass */
function buildGrass(scene){
  const blade = new THREE.PlaneGeometry(0.12, 0.9, 1, 3);
  blade.translate(0, 0.45, 0);

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunColor: { value: new THREE.Color(0xffe6b0) } },
    vertexColors: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying float vHeight;
      varying vec3 vTint;
      attribute vec3 iColor;
      attribute float iPhase;
      attribute float iScale;
      void main(){
        vHeight = position.y;
        vTint = iColor;
        vec3 p = position * vec3(1.0, iScale, 1.0);
        float sway = sin(uTime * 1.4 + iPhase) * 0.14 * pow(vHeight, 1.6);
        p.x += sway;
        p.z += sway * 0.5;
        vec4 world = instanceMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * world;
      }
    `,
    fragmentShader: `
      varying float vHeight;
      varying vec3 vTint;
      void main(){
        vec3 base = vTint * 0.55;
        vec3 tip = vTint * 1.25 + vec3(0.08, 0.06, 0.0);
        vec3 col = mix(base, tip, clamp(vHeight, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.InstancedMesh(blade, mat, GRASS_COUNT);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const colorArr = new Float32Array(GRASS_COUNT * 3);
  const phaseArr = new Float32Array(GRASS_COUNT);
  const scaleArr = new Float32Array(GRASS_COUNT);
  const palette = [0x6f9a52, 0x87ab5f, 0x77a35a, 0x9bb56a];

  for (let i = 0; i < GRASS_COUNT; i++){
    const r = Math.sqrt(Math.random()) * FIELD_RADIUS;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (isNearPondOrPath(x, z)) { i--; continue; }

    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    colorArr[i * 3] = c.r; colorArr[i * 3 + 1] = c.g; colorArr[i * 3 + 2] = c.b;
    phaseArr[i] = Math.random() * Math.PI * 2;
    scaleArr[i] = 0.8 + Math.random() * 0.6;
  }
  blade.setAttribute('iColor', new THREE.InstancedBufferAttribute(colorArr, 3));
  blade.setAttribute('iPhase', new THREE.InstancedBufferAttribute(phaseArr, 1));
  blade.setAttribute('iScale', new THREE.InstancedBufferAttribute(scaleArr, 1));

  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

function isNearPondOrPath(x, z){
  const dPond = Math.hypot(x - POND_CENTER.x, z - POND_CENTER.z);
  if (dPond < POND_RADIUS + 2.5) return true;
  return false;
}

/* ---------------------------------------------------------------- pond */
function buildPond(scene){
  const geo = new THREE.CircleGeometry(POND_RADIUS, 64);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0x8fc7d6) },
      uColorB: { value: new THREE.Color(0xf4d79a) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c);
        float ripple = sin(d * 40.0 - uTime * 1.1) * 0.5 + 0.5;
        float glow = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, ripple * 0.22 + glow * 0.25);
        gl_FragColor = vec4(col, 0.88);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(POND_CENTER.x, 0.02, POND_CENTER.z);
  scene.add(mesh);

  // a handful of lotus blossoms resting on the surface
  const group = new THREE.Group();
  for (let i = 0; i < 7; i++){
    const lotus = makeLotus();
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (POND_RADIUS - 3);
    lotus.position.set(POND_CENTER.x + Math.cos(a) * r, 0.08, POND_CENTER.z + Math.sin(a) * r);
    lotus.rotation.y = Math.random() * Math.PI;
    group.add(lotus);
  }
  scene.add(group);

  return mesh;
}

function makeLotus(){
  const g = new THREE.Group();
  const petalGeo = new THREE.ConeGeometry(0.22, 0.5, 6, 1, true);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf6b9cf, side: THREE.DoubleSide, roughness: 0.6, emissive: 0x3a0f1c, emissiveIntensity: 0.15 });
  for (let i = 0; i < 8; i++){
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.rotation.x = Math.PI * 0.42;
    p.rotation.y = (i / 8) * Math.PI * 2;
    p.position.y = 0.05;
    g.add(p);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffb545, emissiveIntensity: 0.4 }));
  center.position.y = 0.18;
  g.add(center);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshStandardMaterial({ color: 0x3d7a4a, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2;
  g.add(pad);
  return g;
}

/* ---------------------------------------------------------------- bridge */
function buildBridge(scene){
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5133, roughness: 0.85 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5c3b22, roughness: 0.9 });

  const length = POND_RADIUS * 2 + 2;
  const plankCount = 26;
  for (let i = 0; i < plankCount; i++){
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.42), wood);
    const t = i / (plankCount - 1);
    const arch = Math.sin(t * Math.PI) * 1.1;
    plank.position.set(0, 0.4 + arch, -length / 2 + t * length);
    plank.rotation.x = -( (t - 0.5) * 0.5 );
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }
  for (const side of [-0.85, 0.85]){
    for (let i = 0; i < 9; i++){
      const t = i / 8;
      const arch = Math.sin(t * Math.PI) * 1.1;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), woodDark);
      post.position.set(side, 0.75 + arch, -length / 2 + t * length);
      group.add(post);
    }
    const railCurve = new THREE.CatmullRomCurve3(
      Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const arch = Math.sin(t * Math.PI) * 1.1;
        return new THREE.Vector3(side, 1.05 + arch, -length / 2 + t * length);
      })
    );
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 40, 0.05, 6, false), woodDark);
    group.add(rail);
  }

  group.position.set(POND_CENTER.x + 2, 0, POND_CENTER.z);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  return group;
}

/* ---------------------------------------------------------------- trees */
function buildCherryTrees(scene){
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.95 });
  const blossomMats = [0xf6c6d8, 0xf9d8e3, 0xf2b3cc].map(c => new THREE.MeshStandardMaterial({
    color: c, roughness: 0.75, emissive: 0x5a1f34, emissiveIntensity: 0.08,
  }));

  const spots = [
    [POND_CENTER.x - 8, POND_CENTER.z - 6],
    [POND_CENTER.x + 10, POND_CENTER.z + 9],
    [POND_CENTER.x - 12, POND_CENTER.z + 12],
    [8, 40], [-30, -10], [-40, -70], [20, -90], [-20, -140], [10, -170],
  ];
  spots.forEach(([x, z], idx) => {
    const tree = new THREE.Group();
    const h = 4.5 + Math.random() * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, h, 7), trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    for (let i = 0; i < 9; i++){
      const s = 0.9 + Math.random() * 0.9;
      const blossom = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), blossomMats[i % blossomMats.length]);
      blossom.position.set((Math.random() - 0.5) * 3, h + (Math.random() - 0.2) * 2, (Math.random() - 0.5) * 3);
      blossom.castShadow = true;
      tree.add(blossom);
    }
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    group.add(tree);
  });

  scene.add(group);
  return group;
}

/* ---------------------------------------------------------------- clouds */
function buildClouds(scene){
  const tex = makeSoftTexture();
  const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 14; i++){
    const s = new THREE.Sprite(mat.clone());
    const scale = 26 + Math.random() * 30;
    s.scale.set(scale, scale * 0.5, 1);
    s.position.set((Math.random() - 0.5) * 500, 60 + Math.random() * 40, (Math.random() - 0.5) * 500 - 60);
    s.material.opacity = 0.5 + Math.random() * 0.3;
    s.userData.speed = 0.6 + Math.random() * 0.8;
    scene.add(s);
    clouds.push(s);
  }
  return clouds;
}
function updateClouds(clouds, delta){
  clouds.forEach(c => {
    c.position.x += c.userData.speed * delta;
    if (c.position.x > 260) c.position.x = -260;
  });
}
function makeSoftTexture(){
  const size = 128;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/* ---------------------------------------------------------------- birds */
function buildBirds(scene){
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a2f2f, side: THREE.DoubleSide });
  const wingGeo = new THREE.PlaneGeometry(0.6, 0.22);
  const birds = [];
  for (let i = 0; i < 7; i++){
    const bird = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, mat); l.position.x = -0.28;
    const r = new THREE.Mesh(wingGeo, mat); r.position.x = 0.28;
    bird.add(l, r);
    bird.userData = {
      radius: 40 + Math.random() * 60,
      height: 26 + Math.random() * 22,
      speed: 0.06 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      flap: Math.random() * Math.PI * 2,
      center: new THREE.Vector3((Math.random() - 0.5) * 120, 0, -60 + (Math.random() - 0.5) * 160),
      wings: [l, r],
    };
    scene.add(bird);
    birds.push(bird);
  }
  return birds;
}
function updateBirds(birds, time){
  birds.forEach(b => {
    const d = b.userData;
    const a = time * d.speed + d.phase;
    b.position.set(
      d.center.x + Math.cos(a) * d.radius,
      d.height + Math.sin(time * 0.5 + d.phase) * 3,
      d.center.z + Math.sin(a) * d.radius
    );
    b.rotation.y = -a + Math.PI / 2;
    const flap = Math.sin(time * 10 + d.phase) * 0.5;
    d.wings[0].rotation.z = flap;
    d.wings[1].rotation.z = -flap;
  });
}

/* ---------------------------------------------------------------- petals */
function buildPetals(scene){
  const geo = new THREE.PlaneGeometry(0.14, 0.14);
  const mat = new THREE.MeshBasicMaterial({ color: 0xf6c9dd, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, PETAL_COUNT);
  const data = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < PETAL_COUNT; i++){
    const d = {
      x: (Math.random() - 0.5) * FIELD_RADIUS * 1.6,
      z: -Math.random() * 230 + 40,
      y: Math.random() * 20,
      speed: 0.4 + Math.random() * 0.6,
      drift: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
    };
    data.push(d);
    dummy.position.set(d.x, d.y, d.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.userData.data = data;
  scene.add(mesh);
  return mesh;
}
function updatePetals(mesh, time, delta){
  const dummy = new THREE.Object3D();
  const data = mesh.userData.data;
  for (let i = 0; i < data.length; i++){
    const d = data[i];
    d.y -= d.speed * delta;
    if (d.y < 0){ d.y = 18 + Math.random() * 4; }
    const x = d.x + Math.sin(time * 0.5 + d.drift) * 1.6;
    dummy.position.set(x, d.y, d.z);
    dummy.rotation.set(time + d.spin, time * 0.6 + d.spin, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/* ---------------------------------------------------------------- ending tree */
function buildEndingTree(scene){
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.7, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.9 })
  );
  trunk.position.y = 3.5;
  trunk.castShadow = true;
  group.add(trunk);

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffdca0, emissive: 0xffb347, emissiveIntensity: 0.6, roughness: 0.4,
  });
  const canopy = [];
  for (let i = 0; i < 14; i++){
    const s = 1.1 + Math.random() * 1.1;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), glowMat);
    m.position.set((Math.random() - 0.5) * 5, 7 + Math.random() * 3, (Math.random() - 0.5) * 5);
    m.castShadow = true;
    canopy.push(m);
    group.add(m);
  }

  const light = new THREE.PointLight(0xffc978, 0, 40, 2);
  light.position.set(0, 7, 0);
  group.add(light);

  group.position.copy(TREE_END);
  scene.add(group);

  let awake = false;
  function awaken(){ awake = true; }
  function update(time){
    const target = awake ? 3.2 : 0.6;
    light.intensity += (target - light.intensity) * 0.02;
    glowMat.emissiveIntensity = 0.6 + Math.sin(time * 1.5) * (awake ? 0.35 : 0.08);
  }

  return { group, canopy, awaken, update, light };
}
