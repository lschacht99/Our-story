// Pure game-logic helpers shared by the browser engine and the Node test suite.

export function normalizeAnswer(v) {
  return String(v || '')
    .toUpperCase()
    .replace(/[\s.'"’,;:!?()-]+/g, '')
    .replace(/[–—]/g, '')
    .replace(/É/g, 'E');
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Evaluate a submitted answer against a puzzle definition.
// `answer` is the raw text for text puzzles, the option value for choice
// puzzles, or an array of token strings for sequence puzzles.
export async function checkAnswer(puzzle, answer, finalValidationHash) {
  if (puzzle.type === 'sequence') {
    const given = Array.isArray(answer) ? answer.join('|') : String(answer || '');
    return normalizeAnswer(given) === normalizeAnswer(puzzle.answer);
  }
  if (puzzle.type === 'choice') {
    return String(answer || '') === puzzle.answer;
  }
  if (puzzle.validator === 'hash') {
    const hash = await sha256Hex(normalizeAnswer(answer));
    return hash === finalValidationHash;
  }
  return normalizeAnswer(answer) === normalizeAnswer(puzzle.answer);
}

// Parse an unlock condition like "solve:pz-a,pz-b" or "visit:scene-id".
export function conditionMet(cond, save) {
  if (!cond) return true;
  const [kind, rest] = String(cond).split(':');
  const ids = (rest || '').split(',').filter(Boolean);
  if (kind === 'solve') return ids.every((id) => save.solvedPuzzles.includes(id));
  if (kind === 'visit') return ids.every((id) => save.visitedScenes.includes(id));
  if (kind === 'start') return true;
  if (kind === 'scene') return ids.every((id) => save.visitedScenes.includes(id));
  return false;
}

export function sceneComplete(scene, save) {
  const state = save.sceneState[sceneKey(scene)] || { found: [] };
  return (scene.need || []).every(
    (id) => save.solvedPuzzles.includes(id) || state.found.includes(id)
  );
}

function sceneKey(scene) {
  return scene.id || scene;
}

export function chapterComplete(chapter, scenesById, save) {
  return chapter.scenes.every((sid) => {
    const scene = { ...scenesById[sid], id: sid };
    return sceneComplete(scene, save);
  });
}

export function overallProgress(chapters, scenesById, save) {
  const all = chapters.flatMap((c) => c.scenes);
  const done = all.filter((sid) => sceneComplete({ ...scenesById[sid], id: sid }, save)).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}
