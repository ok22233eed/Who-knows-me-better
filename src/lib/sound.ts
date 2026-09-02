"use client";

// Small, synthesized sound cues — no audio files to fetch or license.
// Every function is silent no-op if the browser blocks audio (e.g. no
// user gesture yet) or if the person has muted sound.

let ctx: AudioContext | null = null;
const STORAGE_KEY = "fq_sound_enabled";

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!isSoundEnabled()) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType, peakGain: number) {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playTap() {
  tone(720, 0, 0.09, "sine", 0.06);
}

export function playSuccess() {
  tone(660, 0, 0.12, "sine", 0.07);
  tone(880, 0.1, 0.16, "sine", 0.07);
}

export function playLevelUp() {
  tone(523.25, 0, 0.14, "triangle", 0.08); // C5
  tone(659.25, 0.11, 0.14, "triangle", 0.08); // E5
  tone(783.99, 0.22, 0.28, "triangle", 0.09); // G5
}

export function playShare() {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sawtooth";
  const t0 = audio.currentTime;
  osc.frequency.setValueAtTime(300, t0);
  osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.05, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + 0.22);
}
