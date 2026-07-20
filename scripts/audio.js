// Lightweight chapter score and puzzle cues. The music is synthesized with
// Web Audio so the static PWA keeps working offline without a large dependency.

const THEMES = {
  home: { tempo: 78, root: 50, notes: [7, 12, 15, 14, 12, 9, 10, 7, 5, 9, 7, 4] },
  cinematic: { tempo: 72, root: 50, notes: [0, 3, 7, 10, 12, 15, 14, 10, 7, 5, 3, 2] },
  prologue: { tempo: 88, root: 50, notes: [0, 3, 7, 5, 3, 2, 0, -2] },
  ch1: { tempo: 92, root: 50, notes: [0, 2, 3, 7, 5, 3, 2, 0] },
  ch2: { tempo: 96, root: 53, notes: [7, 9, 10, 14, 12, 10, 7, 5] },
  ch3: { tempo: 94, root: 50, notes: [0, 2, 3, 7, 10, 7, 5, 3] },
  ch4: { tempo: 86, root: 53, notes: [0, 4, 7, 4, 2, 0, -2, 0] },
  ch5: { tempo: 80, root: 50, notes: [0, 3, 7, 12, 10, 7, 5, 3] },
  ch6: { tempo: 98, root: 57, notes: [0, 3, 5, 7, 5, 0, -2, 2] },
  ch7: { tempo: 90, root: 50, notes: [0, 7, 10, 12, 7, 5, 3, 2] },
  final: { tempo: 76, root: 50, notes: [0, 3, 7, 10, 12, 10, 7, 0] }
};

function frequency(midi) {
  return 440 * (2 ** ((midi - 69) / 12));
}

export function createAudioDirector() {
  let context = null;
  let musicGain = null;
  let effectsGain = null;
  let timer = 0;
  let activeChapter = null;
  let enabled = false;
  let step = 0;

  const ensureContext = () => {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    musicGain = context.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(context.destination);
    effectsGain = context.createGain();
    effectsGain.gain.value = 0.55;
    effectsGain.connect(context.destination);
    return context;
  };

  const voice = (midi, start, duration, type = 'triangle', volume = 0.06, destination = musicGain) => {
    if (!context || !destination) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  };

  const scheduleMeasure = () => {
    window.clearTimeout(timer);
    if (!enabled || !activeChapter || !context || context.state !== 'running') return;
    const theme = THEMES[activeChapter] || THEMES.prologue;
    const beat = 60 / theme.tempo;
    const now = context.currentTime + 0.04;
    for (let i = 0; i < 8; i++) {
      const offset = theme.notes[(step + i) % theme.notes.length];
      const cinematic = activeChapter === 'cinematic';
      const home = activeChapter === 'home';
      voice(theme.root + offset, now + i * beat / 2, beat * (cinematic ? 0.7 : 0.42), home ? 'triangle' : 'sine', cinematic ? 0.075 : 0.06);
      if (i % 2 === 0) voice(theme.root - 12 + [0, 5, 3, 7][(step + i) % 4], now + i * beat / 2, beat * 0.9, 'triangle', cinematic ? 0.065 : 0.045);
      if ((home || cinematic) && i % 3 === 0) voice(theme.root + offset + 12, now + i * beat / 2, beat * 0.24, 'sine', home ? 0.028 : 0.04);
    }
    step = (step + 2) % theme.notes.length;
    timer = window.setTimeout(scheduleMeasure, beat * 4000);
  };

  const resume = async () => {
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.08);
    scheduleMeasure();
  };

  const setChapter = (chapterId, shouldPlay) => {
    const nextEnabled = !!shouldPlay;
    const changed = activeChapter !== chapterId;
    if (!changed && enabled === nextEnabled) return;
    activeChapter = chapterId;
    enabled = nextEnabled;
    if (changed) step = 0;
    if (!enabled) {
      window.clearTimeout(timer);
      if (context && musicGain) {
        musicGain.gain.cancelScheduledValues(context.currentTime);
        musicGain.gain.setTargetAtTime(0.0001, context.currentTime, 0.05);
      }
      return;
    }
    resume();
  };

  const playPuzzleCue = (correct, shouldPlay) => {
    if (!shouldPlay) return;
    const ctx = ensureContext();
    if (!ctx) return;
    ctx.resume().then(() => {
      const now = ctx.currentTime + 0.02;
      const notes = correct ? [62, 65, 69, 74] : [62, 61, 58];
      notes.forEach((note, i) => voice(note, now + i * 0.1, 0.22, correct ? 'triangle' : 'sine', 0.12, effectsGain));
    }).catch(() => {});
  };

  const unlock = () => {
    if (enabled) resume();
  };

  return { setChapter, playPuzzleCue, unlock };
}
