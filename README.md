# Chapter I — Where Every Flower Waited For You

A quiet, handcrafted 3D world built with Three.js and GSAP. No frameworks, no build step.

## Running it

1. Open this folder in VS Code.
2. Install the **Live Server** extension if you don't already have it.
3. Right-click `index.html` → **Open with Live Server**.
4. It needs an internet connection the first time it loads — Three.js, GSAP and the two Google Fonts are pulled from public CDNs, nothing is bundled locally.

That's it. No `npm install`, no build tools.

## What's inside

- **The intro** — a black screen, quiet stars, two lines of text, then the valley is revealed.
- **The flower valley** — an endless meadow of swaying lavender, tulips, roses and sunflowers, a lotus pond with a wooden bridge, cherry blossom trees, drifting clouds, birds, and floating petals — all built out of Three.js primitives at runtime. Nothing here depends on external 3D models or textures.
- **The golden butterfly** — wanders, circles, and lands near the flowers on its own small state machine. It never speaks; it just leads.
- **Twenty glowing flowers** — click or tap one to open a handwritten-style letter. Every message is original, written to sound like Kajal speaking gently to Amit.
- **The soundtrack** — a soft piano pad, wind, water, and birds, all *synthesized live* with the Web Audio API. There are no audio files to manage; it starts the moment you step inside (browsers require a user gesture before audio can play, which is exactly what the "step inside" button gives it).
- **The ending** — the path leads to one glowing tree, a final quiet line, and a portal into "Chapter II."

## File structure

```
Chapter-1/
├── index.html          entry point
├── style.css            every visual style — intro, letters, ending, UI
├── script.js             orchestrates the whole experience + the intro/ending timelines
├── js/
│   ├── scene.js           renderer, lighting, bloom post-processing
│   ├── camera.js          the camera, its cinematic path, and mouse-parallax look-around
│   ├── world.js            ground, grass, pond, bridge, cherry trees, clouds, birds, petals
│   ├── flowers.js           the ambient flower field + the 20 interactive glowing flowers
│   ├── butterfly.js          the golden guide butterfly + a few small ambient ones
│   ├── interactions.js       click/tap handling, the letter modal, and the 20 letters
│   └── audio.js              the fully synthesized ambient soundtrack
└── assets/                  empty on purpose — see note below
```

## About the `assets/` folder

Everything you see and hear is generated in code — geometry built from Three.js primitives, textures painted onto `<canvas>` at runtime, music synthesized with the Web Audio API. That was a deliberate choice: it means the experience runs completely on its own, with nothing missing.

The `assets/audio`, `assets/textures`, `assets/models` and `assets/images` folders are left in place if you'd ever like to swap in real files later:

- Drop an `.mp3`/`.ogg` into `assets/audio/` and swap the synthesized pad in `js/audio.js` for an `<audio>`-backed `AudioBufferSourceNode` if you'd rather use a real piano recording.
- Drop a `.glb` butterfly or flower model into `assets/models/` and load it with `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`) in `js/butterfly.js` or `js/flowers.js` in place of the procedural geometry.
- Drop photos into `assets/images/` to use as `THREE.TextureLoader` textures on the ground, petals, or inside a letter.

None of that is required — the project works fully as-is.

## Personalizing it further

- The 20 letters live at the top of `js/interactions.js` in the `LETTERS` array — edit the text freely.
- The two intro lines and the two ending lines live directly in `index.html`.
- Colors and fonts are defined as CSS custom properties at the top of `style.css` (`:root`), and as the palette used throughout `js/*.js`.
