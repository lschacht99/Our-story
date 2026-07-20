// Versioned save schema, migrations and (de)serialization.
// Pure module: no DOM, no localStorage — usable from Node tests.

export const SAVE_VERSION = 4;

export function blankSave(slotId = null, profileName = 'Nomads') {
  return {
    saveVersion: SAVE_VERSION,
    slotId,
    profileName,
    chapterId: 'prologue',
    sceneId: 'p01-paris-apartment',
    sceneState: {},
    visitedScenes: [],
    inventory: [],
    solvedPuzzles: [],
    clueBoard: [],
    rabbitMarks: [],
    journeySeals: { eye: 0, gear: 0, compass: 0, key: 0, hands: 0 },
    fragments: [],
    stamps: [],
    memoryPoints: 0,
    insightTokens: 3,
    encounteredPuzzles: [],
    puzzleMisses: {},
    playedCutscenes: [],
    unlockedCutscenes: ['cs01-invitation'],
    drafts: {},
    hintsUsed: {},
    view: 'moshe',
    playTime: 0,
    finished: false,
    settings: {
      sound: true, music: true, captions: true, largeText: false,
      contrast: false, reducedMotion: false, hotspotHighlight: false, clock24: true
    },
    lastSavedAt: null
  };
}

// Migrate any raw parsed object to the current schema.
// Returns a valid save, or null when the data is unrecognizable.
// Never silently discards player progress: unknown extra keys are kept.
export function migrateSave(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // v0: legacy chapter-1 prototype ("hamsa-missing-journey-png-v2" blob)
  if (raw.saveVersion === undefined && (raw.scene || raw.solved)) {
    const s = blankSave(null, 'Migrated journey');
    const legacyScenes = {
      paris: 'p01-paris-apartment', cdg: 'p02-paris-airport', istanbul: 'p03-istanbul',
      muscat: 'p04-muscat', mumbai: 'p05-mumbai-arrivals', memory: 'c1s1-havdalah'
    };
    const legacyPuzzles = {
      p1: 'pz-invitation', p2: 'pz-packing', p3: 'pz-timetable', p4: 'pz-scale',
      p5: 'pz-clocks', p6: 'pz-tiles', p7: 'pz-suitcase', p8: 'pz-stars',
      p9: 'pz-seats', p10: 'pz-corridors'
    };
    s.sceneId = legacyScenes[raw.scene] || s.sceneId;
    s.solvedPuzzles = (raw.solved || []).map((id) => legacyPuzzles[id] || id);
    s.rabbitMarks = Array.from({ length: raw.rabbit || 0 }, (_, i) => `legacy-rm-${i + 1}`);
    if (raw.settings) {
      s.settings.sound = raw.settings.sound !== false;
      s.settings.largeText = !!raw.settings.large;
      s.settings.contrast = !!raw.settings.contrast;
    }
    s.migratedFrom = 'legacy-v0';
    return s;
  }

  if (typeof raw.saveVersion !== 'number') return null;
  let save = { ...raw };

  if (save.saveVersion === 1) {
    // v1 → v2: journeySeals became a per-seal counter object
    const total = typeof save.journeySeals === 'number' ? save.journeySeals : 0;
    save.journeySeals = { eye: total, gear: 0, compass: 0, key: 0, hands: 0 };
    save.saveVersion = 2;
  }
  if (save.saveVersion === 2) {
    // v2 → v3: added fragments, stamps, view, hintsUsed, visitedScenes
    save.fragments = save.fragments || [];
    save.stamps = save.stamps || [];
    save.view = save.view || 'moshe';
    save.hintsUsed = save.hintsUsed || {};
    save.visitedScenes = save.visitedScenes || [];
    save.saveVersion = 3;
  }
  if (save.saveVersion === 3) {
    // v3 → v4: Memory Points, Insight Tokens, puzzle discovery, cutscene guards.
    // Older saves get retroactive points so long-running journeys aren't zeroed.
    save.memoryPoints = save.memoryPoints ?? (save.solvedPuzzles?.length || 0) * 35;
    save.insightTokens = save.insightTokens ?? Math.max(1, (save.rabbitMarks?.length || 0));
    save.encounteredPuzzles = save.encounteredPuzzles || [...(save.solvedPuzzles || [])];
    save.puzzleMisses = save.puzzleMisses || {};
    save.playedCutscenes = save.playedCutscenes || [...(save.unlockedCutscenes || [])];
    save.saveVersion = 4;
  }
  if (save.saveVersion !== SAVE_VERSION) return null; // future version: do not touch

  // Fill any missing fields from the blank template without erasing data.
  const base = blankSave(save.slotId, save.profileName);
  const merged = { ...base, ...save, settings: { ...base.settings, ...(save.settings || {}) } };
  return merged;
}

export function serializeSave(save) {
  return JSON.stringify({ ...save, lastSavedAt: save.lastSavedAt || new Date().toISOString() });
}

export function deserializeSave(text) {
  try {
    return migrateSave(JSON.parse(text));
  } catch {
    return null;
  }
}

export function slotSummary(save, chapters, scenesById, progressFn) {
  if (!save) return { status: 'empty' };
  const p = progressFn ? progressFn(save) : { pct: 0 };
  return {
    status: save.finished ? 'completed' : 'normal',
    profileName: save.profileName,
    chapterId: save.chapterId,
    sceneId: save.sceneId,
    playTime: save.playTime,
    puzzles: save.solvedPuzzles.length,
    rabbitMarks: save.rabbitMarks.length,
    pct: p.pct,
    lastSavedAt: save.lastSavedAt
  };
}
