// js/scene.js — renderer, scene, lighting and the soft bloom post-process
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createRenderer(canvas){
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function createScene(){
  const scene = new THREE.Scene();
  // warm dawn haze — softens distance and hides the field's edges
  scene.fog = new THREE.FogExp2(0xf6d9a6, 0.014);
  scene.background = new THREE.Color(0xf7dfb4);
  return scene;
}

export function createLights(scene){
  const sun = new THREE.DirectionalLight(0xffe3ac, 2.4);
  sun.position.set(-40, 55, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.bias = -0.0015;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xfff1d0, 0x9fae7d, 0.9);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffe9c7, 0.35);
  scene.add(ambient);

  // a soft glowing sun disc, low on the horizon
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffe3ac,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  sunSprite.scale.set(140, 140, 1);
  sunSprite.position.set(-140, 50, -160);
  scene.add(sunSprite);

  return { sun, hemi, ambient, sunSprite };
}

function makeGlowTexture(){
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,230,180,0.9)');
  g.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createComposer(renderer, scene, camera){
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,  // strength
    0.7,   // radius
    0.82   // threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return { composer, bloom };
}

export { makeGlowTexture };
