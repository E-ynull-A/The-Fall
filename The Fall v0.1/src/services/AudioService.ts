/**
 * Sound effects synthesised with the Web Audio API — no audio files needed.
 * Muting is a per-player convenience remembered in localStorage.
 */

export type SoundCue = 'card' | 'coin' | 'bell' | 'battle' | 'victory' | 'defeat' | 'event' | 'click';

const MUTE_KEY = 'thefall.muted';
let ctx: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* storage unavailable: keep the in-memory setting */
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, gain = 0.12) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

function noise(ac: AudioContext, start: number, duration: number, gain: number, lowpass: number) {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export function playSound(cue: SoundCue): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  switch (cue) {
    case 'click':
      tone(ac, 660, 0, 0.05, 'triangle', 0.04);
      break;
    case 'card':
      noise(ac, 0, 0.12, 0.25, 3500);
      tone(ac, 520, 0.03, 0.12, 'triangle', 0.05);
      break;
    case 'coin':
      tone(ac, 1320, 0, 0.12, 'square', 0.03);
      tone(ac, 1760, 0.06, 0.16, 'square', 0.03);
      break;
    case 'bell':
      tone(ac, 392, 0, 1.6, 'sine', 0.14);
      tone(ac, 784, 0, 1.0, 'sine', 0.05);
      tone(ac, 1176, 0, 0.6, 'sine', 0.03);
      break;
    case 'battle':
      noise(ac, 0, 0.35, 0.5, 400);
      noise(ac, 0.22, 0.3, 0.4, 300);
      tone(ac, 110, 0, 0.4, 'sawtooth', 0.05);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.12, 0.7, 'triangle', 0.07));
      break;
    case 'defeat':
      [392, 349, 311, 262].forEach((f, i) => tone(ac, f, i * 0.25, 0.8, 'sine', 0.08));
      break;
    case 'event':
      tone(ac, 196, 0, 0.6, 'sawtooth', 0.05);
      tone(ac, 294, 0.15, 0.7, 'sawtooth', 0.04);
      break;
  }
}
