// js/audio.js — soft looping piano, wind, water and birds, synthesized live.
// No external audio files are used: everything here is generated with the Web Audio API,
// so the experience runs complete even before you drop anything into /assets/audio.

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C major pentatonic-ish, two octaves

export function createAudioEngine(){
  let ctx = null;
  let master, padGain, pianoBus, windGain, waterGain, birdGain, reverb;
  let running = false;
  let timers = [];

  function build(){
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 3.2, 3.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.55;
    reverb.connect(reverbGain);
    reverbGain.connect(master);

    // --- warm pad ---------------------------------------------------
    padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padGain.connect(padFilter);
    padFilter.connect(master);
    padFilter.connect(reverb);

    [130.81, 164.81, 196.0].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      osc.connect(g);
      g.connect(padGain);
      osc.start();
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();

    // --- piano bus ----------------------------------------------------
    pianoBus = ctx.createGain();
    pianoBus.gain.value = 0.35;
    pianoBus.connect(master);
    pianoBus.connect(reverb);

    // --- wind -----------------------------------------------------
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = makeNoiseBuffer(ctx, 4);
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.08;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 200;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windLfo.start();

    // --- water --------------------------------------------------
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = makeNoiseBuffer(ctx, 3);
    waterSrc.loop = true;
    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'highpass';
    waterFilter.frequency.value = 2200;
    waterGain = ctx.createGain();
    waterGain.gain.value = 0.022;
    waterSrc.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(master);
    waterSrc.start();

    // --- birds bus ------------------------------------------------
    birdGain = ctx.createGain();
    birdGain.gain.value = 0.5;
    birdGain.connect(master);

    scheduleNotes();
    scheduleBirds();
  }

  function pluckNote(freq, time, dur = 1.6, vel = 0.18){
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;

    osc.connect(g);
    osc2.connect(g2);
    g2.connect(g);
    g.connect(pianoBus);

    osc.start(time); osc.stop(time + dur + 0.1);
    osc2.start(time); osc2.stop(time + dur + 0.1);
  }

  function scheduleNotes(){
    const tick = () => {
      if (!running) return;
      if (Math.random() < 0.72){
        const freq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        pluckNote(freq, ctx.currentTime + 0.05, 2.2 + Math.random() * 1.4, 0.1 + Math.random() * 0.08);
      }
      timers.push(setTimeout(tick, 1800 + Math.random() * 2600));
    };
    tick();
  }

  function chirp(time){
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = 1800 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, time);
    osc.frequency.exponentialRampToValueAtTime(base * 1.4, time + 0.06);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.05, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(g); g.connect(birdGain);
    osc.start(time); osc.stop(time + 0.22);
  }

  function scheduleBirds(){
    const tick = () => {
      if (!running) return;
      if (Math.random() < 0.5){
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) chirp(ctx.currentTime + i * 0.14 + Math.random() * 0.05);
      }
      timers.push(setTimeout(tick, 4000 + Math.random() * 6000));
    };
    timers.push(setTimeout(tick, 2000));
  }

  function makeNoiseBuffer(ctx, seconds){
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeImpulse(ctx, seconds, decay){
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++){
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++){
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  return {
    start(){
      if (running) return;
      running = true;
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 3.5);
    },
    duck(amount = 0.35, seconds = 0.6){
      if (!ctx) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(amount, t + seconds);
    },
    unduck(seconds = 0.8){
      if (!ctx) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.65, t + seconds);
    },
    stop(){
      running = false;
      timers.forEach(clearTimeout);
      timers = [];
      if (ctx && master){
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.0, t + 2);
      }
    },
  };
}
