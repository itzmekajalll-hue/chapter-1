// js/interactions.js — clicking a glowing flower opens a letter that was waiting for you
import * as THREE from 'three';

export const LETTERS = [
  "I don't know if you notice it, but you carry a quiet warmth that makes people feel safe around you. I've always admired that about you.",
  "Some days feel heavy, and yet you still find a way to smile and lift the people around you. That takes a strength you don't give yourself enough credit for.",
  "I love how curious you are about the world — the way you ask questions no one else thinks to ask. It's one of my favorite things about you.",
  "Even on your busiest days, you make time to check on the people you care about. That kindness doesn't go unnoticed, not by me.",
  "You have this way of making ordinary moments feel a little brighter, just by being yourself. I hope you know that.",
  "Whenever you laugh — really laugh — the whole room feels lighter. I hope life keeps giving you reasons to.",
  "I'm grateful for every conversation we've shared. They've meant more to me than I've probably said out loud.",
  "You don't have to have everything figured out. Watching you grow, one small step at a time, has been beautiful to witness.",
  "There's a gentleness in how you treat people, even when they don't deserve it. The world needs more of that, and more of you.",
  "I hope, on your hardest days, you remember that you're allowed to rest. You don't have to earn softness.",
  "You've inspired me more than you probably know — not through grand gestures, but in the quiet, steady way you show up.",
  "Whatever you're chasing right now, I believe you'll get there. And even if the road bends, I don't think you'll walk it alone.",
  "It's strange how one person can make a place feel like home just by being in it. You've always had that effect.",
  "I hope you never lose that spark of wonder you have — the one that notices small, beautiful things everyone else walks past.",
  "You give so much of yourself to others. I hope someone is giving that same care back to you, too.",
  "If I could hand you one thing today, it would be permission to be proud of how far you've come.",
  "Your patience with people, even when they test it, says something quiet and important about who you are.",
  "I think about how lucky the people in your life are, to have someone who listens the way you do.",
  "Whatever tomorrow holds, I hope it's kinder to you than yesterday was. You deserve that much, and more.",
  "This whole quiet little world was built for one reason: so that, for just a few minutes, you'd feel how much you're cared for.",
];

export function setupInteractions({ renderer, camera, cameraRig, specialFlowers, audioEngine, onEndingReady }){
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitTargets = specialFlowers.flowers.map(f => f.hit);
  const found = new Set();

  const modal = document.getElementById('letter-modal');
  const letterBody = document.getElementById('letter-body');
  const closeBtn = document.getElementById('letter-close');
  const counterEl = document.getElementById('flower-count-num');
  const counterWrap = document.getElementById('flower-counter');
  const hintBar = document.getElementById('hint-bar');

  let modalOpen = false;
  let downPos = null;

  function openLetter(letterIndex, flower){
    if (!found.has(letterIndex)){
      found.add(letterIndex);
      flower.markFound();
      counterEl.textContent = String(found.size);
      if (found.size >= LETTERS.length) onEndingReady && onEndingReady();
    }
    letterBody.textContent = LETTERS[letterIndex];
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modalOpen = true;
    cameraRig.setPaused(true);
    audioEngine.duck(0.3, 0.7);
  }

  function closeLetter(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modalOpen = false;
    cameraRig.setPaused(false);
    audioEngine.unduck(0.9);
  }

  closeBtn.addEventListener('click', closeLetter);
  modal.querySelector('.letter-backdrop').addEventListener('click', closeLetter);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen) closeLetter(); });

  function pointerFromEvent(e){
    const x = e.clientX ?? (e.changedTouches && e.changedTouches[0].clientX);
    const y = e.clientY ?? (e.changedTouches && e.changedTouches[0].clientY);
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
    return { x, y };
  }

  renderer.domElement.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (modalOpen) return;
    if (downPos){
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (moved > 12) return; // treat as a drag / look-around, not a tap
    }
    pointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    if (hits.length){
      const target = hits[0].object;
      const flower = specialFlowers.flowers.find(f => f.hit === target);
      if (flower) openLetter(target.userData.letterIndex, flower);
    }
  });

  function revealUI(){
    counterWrap.classList.add('shown');
    hintBar.classList.add('shown');
  }
  counterWrap.setAttribute('aria-hidden', 'false');
  hintBar.setAttribute('aria-hidden', 'false');

  function handleResize(camera, renderer, composer){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  }

  return { revealUI, handleResize, closeLetter, isModalOpen: () => modalOpen, foundCount: () => found.size };
}
