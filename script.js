// script.js — Chapter I: Where Every Flower Waited For You
import * as THREE from 'three';
import { createRenderer, createScene, createLights, createComposer } from './js/scene.js';
import { createCamera, createCameraPath, CameraRig } from './js/camera.js';
import { buildWorld } from './js/world.js';
import { buildFlowerField, buildSpecialFlowers } from './js/flowers.js';
import { createButterfly, createAmbientButterflies } from './js/butterfly.js';
import { setupInteractions, LETTERS } from './js/interactions.js';
import { createAudioEngine } from './js/audio.js';

/* ============================================================ intro stars */
const starsCanvas = document.getElementById('stars-canvas');
const starsCtx = starsCanvas.getContext('2d');
let stars = [];
let starsRaf = null;

function sizeStarsCanvas(){
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
}
function seedStars(){
  const count = Math.floor((window.innerWidth * window.innerHeight) / 6000);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.4 + 0.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.8,
  }));
}
function drawStars(t){
  starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  for (const s of stars){
    const tw = 0.5 + Math.sin(t * 0.001 * s.speed + s.phase) * 0.5;
    starsCtx.globalAlpha = 0.15 + tw * 0.85;
    starsCtx.fillStyle = tw > 0.6 ? '#fff3d6' : '#ffffff';
    starsCtx.beginPath();
    starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    starsCtx.fill();
  }
  starsRaf = requestAnimationFrame(drawStars);
}
sizeStarsCanvas();
seedStars();
starsRaf = requestAnimationFrame(drawStars);
window.addEventListener('resize', () => { sizeStarsCanvas(); seedStars(); });

/* ============================================================ intro text timeline */
const introTl = gsap.timeline({ delay: 0.8 });
introTl
  .to('.intro-line[data-line="1"]', { opacity: 1, duration: 2.2, ease: 'power1.out' })
  .to('.intro-line[data-line="1"]', { opacity: 0, duration: 1.5, ease: 'power1.in' }, '+=1.6')
  .to('.intro-line[data-line="2"]', { opacity: 1, duration: 2.2, ease: 'power1.out' }, '+=0.2')
  .to('.intro-line[data-line="2"]', { opacity: 0.85, duration: 1.2, ease: 'power1.in' }, '+=1.8')
  .call(() => document.getElementById('enter-btn').classList.add('shown'));

/* ============================================================ three.js world */
const canvas = document.getElementById('webgl');
const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera();
createLights(scene);

const world = buildWorld(scene);
const flowerField = buildFlowerField(scene);
const specialFlowers = buildSpecialFlowers(scene);
const butterfly = createButterfly(scene);
const ambientButterflies = createAmbientButterflies(scene, 5);

const curve = createCameraPath();
const cameraRig = new CameraRig(camera, curve, { durationSeconds: 215, onEnd: triggerEnding });
cameraRig.setPaused(true); // holds at the entrance until the visitor steps inside

const { composer } = createComposer(renderer, scene, camera);
const audioEngine = createAudioEngine();

const interactions = setupInteractions({
  renderer, camera, cameraRig, specialFlowers, audioEngine,
  onEndingReady: () => { /* every letter found — the tree is listening either way */ },
});

window.addEventListener('resize', () => interactions.handleResize(camera, renderer, composer));

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;

  cameraRig.update(delta, elapsed);
  world.update(elapsed, delta);
  flowerField.update(elapsed);
  specialFlowers.update(elapsed);
  butterfly.update(delta, elapsed);
  ambientButterflies.update(elapsed);

  composer.render();
}
animate();

/* ============================================================ loading screen */
window.requestAnimationFrame(() => {
  setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 500);
});

/* ============================================================ enter the world */
document.getElementById('enter-btn').addEventListener('click', () => {
  audioEngine.start();
  document.getElementById('intro-overlay').classList.add('fading');
  canvas.classList.add('visible');
  cameraRig.setPaused(false);

  setTimeout(() => {
    document.getElementById('intro-overlay').style.display = 'none';
    cancelAnimationFrame(starsRaf);
    interactions.revealUI();
  }, 2300);
}, { once: true });

/* ============================================================ the ending */
let endingStarted = false;
function triggerEnding(){
  if (endingStarted) return;
  endingStarted = true;

  world.endingTree.awaken();
  audioEngine.duck(0.42, 2.5);

  const overlay = document.getElementById('ending-overlay');
  overlay.classList.add('shown');
  document.getElementById('hint-bar').classList.remove('shown');
  document.getElementById('flower-counter').classList.remove('shown');

  const tl = gsap.timeline({ delay: 1.2 });
  tl.to('.ending-line[data-line="1"]', { opacity: 1, duration: 2.2, ease: 'power1.out' })
    .to('.ending-line[data-line="1"]', { opacity: 0, duration: 1.6, ease: 'power1.in' }, '+=1.9')
    .to('.ending-line[data-line="2"]', { opacity: 1, duration: 2.2, ease: 'power1.out' }, '+=0.2')
    .to('.portal-wrap', { opacity: 1, duration: 2.6, ease: 'power1.out' }, '+=1.4')
    .call(() => document.getElementById('fade-to-black').classList.add('on'), [], '+=2.6')
    .call(() => audioEngine.stop(), [], '+=1.8');
}
