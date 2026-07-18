// Tiny WebAudio synthesizer for interface sound cues.
// No audio assets required (keeps the PNG-only asset rule untouched).
// Every cue respects the player's sound setting and fails silently
// where WebAudio is unavailable.

let ctx = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function tone(freq, { start = 0, duration = 0.12, type = 'sine', gain = 0.08, slide = 0 } = {}) {
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const CUES = {
  tap: () => tone(660, { duration: 0.06, gain: 0.05 }),
  search: () => tone(440, { duration: 0.09, gain: 0.04, slide: -120 }),
  clue: () => { tone(523, {}); tone(784, { start: 0.09 }); },
  rabbit: () => { tone(880, { duration: 0.07 }); tone(1175, { start: 0.08, duration: 0.09 }); },
  solve: () => { tone(523, {}); tone(659, { start: 0.1 }); tone(784, { start: 0.2 }); tone(1046, { start: 0.3, duration: 0.22 }); },
  wrong: () => tone(196, { duration: 0.18, type: 'triangle', gain: 0.06, slide: -40 }),
  travel: () => tone(392, { duration: 0.14, slide: 180, gain: 0.05 }),
  stamp: () => { tone(330, { duration: 0.08, type: 'triangle', gain: 0.09 }); tone(330, { start: 0.02, duration: 0.05, gain: 0.05 }); },
  hint: () => tone(587, { duration: 0.1, gain: 0.05, slide: 90 })
};

// Play a named cue if the player's sound setting allows it.
export function sfx(name, save) {
  try {
    if (!save?.settings?.sound) return;
    CUES[name]?.();
  } catch { /* audio is never allowed to break gameplay */ }
}
