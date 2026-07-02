// js/butterfly.js — the golden butterfly that quietly leads the way
import * as THREE from 'three';
import { SPECIAL_POSITIONS } from './flowers.js';

export function createButterfly(scene){
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffcf6b, emissive: 0xffb545, emissiveIntensity: 1.1, roughness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 3, 6), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xffd98a, emissive: 0xffae3f, emissiveIntensity: 1.4,
    side: THREE.DoubleSide, transparent: true, opacity: 0.92,
  });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.28, 0.1, 0.22, 0.3);
  wingShape.quadraticCurveTo(0.1, 0.34, 0, 0.12);
  wingShape.quadraticCurveTo(-0.02, 0.02, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);

  const wingL = new THREE.Group();
  const wL = new THREE.Mesh(wingGeo, wingMat);
  wingL.add(wL);
  wingL.position.set(-0.02, 0.02, 0);

  const wingR = new THREE.Group();
  const wR = new THREE.Mesh(wingGeo, wingMat);
  wR.scale.x = -1;
  wingR.add(wR);
  wingR.position.set(0.02, 0.02, 0);

  group.add(wingL, wingR);

  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlow(), color: 0xffcf7d, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glowSprite.scale.set(1.1, 1.1, 1);
  group.add(glowSprite);

  const light = new THREE.PointLight(0xffc46b, 1.2, 6, 2);
  group.add(light);

  scene.add(group);

  const waypoints = SPECIAL_POSITIONS.map(([x, z]) =>
    new THREE.Vector3(x + (Math.random() - 0.5) * 3, 1.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * 3)
  );
  waypoints.push(new THREE.Vector3(0, 26, 60)); // near the entrance, for the reveal moment

  let index = 0;
  let target = waypoints[0].clone();
  let state = 'to_target';
  let stateTimer = 0;
  let circleAngle = Math.random() * Math.PI * 2;
  const circleCenter = new THREE.Vector3();
  group.position.copy(waypoints[waypoints.length - 1]);

  function pickNextState(){
    const roll = Math.random();
    if (roll < 0.35){ state = 'circle'; stateTimer = 2 + Math.random() * 3; circleCenter.copy(target); circleAngle = Math.random() * Math.PI * 2; }
    else if (roll < 0.6){ state = 'land'; stateTimer = 1.6 + Math.random() * 2.4; }
    else if (roll < 0.75){ state = 'wait'; stateTimer = 1 + Math.random() * 1.6; }
    else { advanceTarget(); state = 'to_target'; }
  }

  function advanceTarget(){
    index = (index + 1) % waypoints.length;
    target = waypoints[index].clone();
  }

  function update(delta, time){
    const flapSpeed = state === 'land' ? 6 : state === 'to_target' ? 16 : 11;
    const flap = Math.sin(time * flapSpeed) * 0.9 + 0.15;
    wingL.rotation.y = flap;
    wingR.rotation.y = -flap;

    if (state === 'to_target'){
      const dir = target.clone().sub(group.position);
      const dist = dir.length();
      if (dist < 0.4){
        pickNextState();
      } else {
        dir.normalize();
        group.position.addScaledVector(dir, Math.min(dist, delta * 3.4));
        const lookAt = group.position.clone().add(dir);
        group.lookAt(lookAt);
      }
    } else if (state === 'circle'){
      circleAngle += delta * 1.1;
      const r = 1.3;
      group.position.set(
        circleCenter.x + Math.cos(circleAngle) * r,
        circleCenter.y + Math.sin(time * 1.8) * 0.15,
        circleCenter.z + Math.sin(circleAngle) * r
      );
      group.lookAt(circleCenter.x + Math.cos(circleAngle + 0.3) * r, group.position.y, circleCenter.z + Math.sin(circleAngle + 0.3) * r);
      stateTimer -= delta;
      if (stateTimer <= 0){ advanceTarget(); state = 'to_target'; }
    } else if (state === 'land'){
      group.position.y = target.y - 0.55 + Math.sin(time * 2) * 0.01;
      stateTimer -= delta;
      if (stateTimer <= 0){ advanceTarget(); state = 'to_target'; }
    } else { // wait
      group.position.y += Math.sin(time * 2.4) * 0.002;
      stateTimer -= delta;
      if (stateTimer <= 0){ advanceTarget(); state = 'to_target'; }
    }
  }

  return { group, update };
}

function makeGlow(){
  const size = 128;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,220,150,0.95)');
  g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/* ---------------------------------------------------------- ambient butterflies */
export function createAmbientButterflies(scene, count = 5){
  const colors = [0xf7c8dc, 0xd8c9f4, 0xfff0c2, 0xc9e6d8];
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.18, 0.06, 0.14, 0.2);
  shape.quadraticCurveTo(0.06, 0.22, 0, 0.08);
  const geo = new THREE.ShapeGeometry(shape);

  const butterflies = [];
  for (let i = 0; i < count; i++){
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
    const group = new THREE.Group();
    const l = new THREE.Mesh(geo, mat); l.position.x = -0.01;
    const r = new THREE.Mesh(geo, mat); r.position.x = 0.01; r.scale.x = -1;
    group.add(l, r);
    const data = {
      center: new THREE.Vector3((Math.random() - 0.5) * 120, 1 + Math.random() * 2.5, -Math.random() * 200 + 40),
      radius: 2 + Math.random() * 3,
      speed: 0.4 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      wings: [l, r],
    };
    group.userData = data;
    scene.add(group);
    butterflies.push(group);
  }

  function update(time){
    butterflies.forEach(b => {
      const d = b.userData;
      const a = time * d.speed + d.phase;
      b.position.set(
        d.center.x + Math.cos(a) * d.radius,
        d.center.y + Math.sin(time * 1.5 + d.phase) * 0.3,
        d.center.z + Math.sin(a) * d.radius
      );
      const flap = Math.sin(time * 14 + d.phase) * 0.8 + 0.2;
      d.wings[0].rotation.y = flap;
      d.wings[1].rotation.y = -flap;
    });
  }

  return { butterflies, update };
}
