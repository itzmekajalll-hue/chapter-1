// js/camera.js — the camera and the slow, smooth path it drifts along
import * as THREE from 'three';

export function createCamera(){
  const camera = new THREE.PerspectiveCamera(
    52, window.innerWidth / window.innerHeight, 0.1, 800
  );
  return camera;
}

// The valley path: a wide entrance, a swing past the lotus pond and bridge,
// a quiet stretch through the deeper fields, ending at the glowing tree.
export function createCameraPath(){
  const points = [
    new THREE.Vector3(0, 34, 95),
    new THREE.Vector3(14, 22, 55),
    new THREE.Vector3(26, 13, 18),
    new THREE.Vector3(18, 9, -12),
    new THREE.Vector3(2, 7.5, -42),
    new THREE.Vector3(-16, 8.5, -80),
    new THREE.Vector3(-10, 8, -125),
    new THREE.Vector3(-6, 7, -165),
    new THREE.Vector3(-9, 6.4, -198),
    new THREE.Vector3(-9, 6.2, -216),
  ];
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
}

export class CameraRig{
  constructor(camera, curve, opts = {}){
    this.camera = camera;
    this.curve = curve;
    this.durationSeconds = opts.durationSeconds || 210;
    this.t = 0;
    this.paused = false;
    this.endReached = false;
    this.onEnd = opts.onEnd || (() => {});

    this._mouse = new THREE.Vector2(0, 0);
    this._mouseSmoothed = new THREE.Vector2(0, 0);
    this._bobPhase = Math.random() * 10;

    this._bindPointer();
  }

  _bindPointer(){
    const setFromClient = (x, y) => {
      this._mouse.x = (x / window.innerWidth) * 2 - 1;
      this._mouse.y = (y / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', (e) => setFromClient(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) setFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  setPaused(p){ this.paused = p; }

  update(delta, elapsed){
    if (this.paused || this.endReached) return;

    this.t += delta / this.durationSeconds;
    if (this.t >= 1){
      this.t = 1;
      this.endReached = true;
      this.onEnd();
    }

    const pos = this.curve.getPointAt(this.t);
    const tangent = this.curve.getTangentAt(this.t).normalize();

    // gentle organic float, like drifting rather than gliding on rails
    const bob = Math.sin(elapsed * 0.6 + this._bobPhase) * 0.35;
    this.camera.position.set(pos.x, pos.y + bob, pos.z);

    // smooth the mouse so look-around never snaps
    this._mouseSmoothed.lerp(this._mouse, 1 - Math.pow(0.001, delta));

    const lookTarget = pos.clone().add(tangent.multiplyScalar(14));
    this.camera.lookAt(lookTarget);

    // small parallax rotation layered on top of the path-facing orientation
    this.camera.rotation.y += this._mouseSmoothed.x * 0.16;
    this.camera.rotation.x += -this._mouseSmoothed.y * 0.08;
  }

  getProgress(){ return this.t; }
}
