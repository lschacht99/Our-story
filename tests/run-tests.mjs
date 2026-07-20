#!/usr/bin/env node
// Data-integrity, save-migration, puzzle-logic, asset-format and spoiler tests.
// Run: node tests/run-tests.mjs   (exits non-zero on any failure)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAnswer, sha256Hex, checkAnswer, conditionMet, sceneComplete, puzzleAward } from '../scripts/core.js';
import { blankSave, migrateSave, deserializeSave, serializeSave, SAVE_VERSION } from '../scripts/save-core.js';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
let failures = 0, checks = 0;
function ok(cond, msg) {
  checks += 1;
  if (!cond) { failures += 1; console.error(`FAIL: ${msg}`); }
}
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const chapters = json('data/chapters.json').chapters;
const scenes = json('data/scenes.json').scenes;
const puzzles = json('data/puzzles.json').puzzles;
const cutscenes = json('data/cutscenes.json').cutscenes;
const mystery = json('data/mystery.json');
const characters = json('data/characters.json').characters;

function walk(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === '.git' || name === 'node_modules') continue;
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const allFiles = walk('.');

// ---------- 1. forbidden formats anywhere in the repo ----------
const FORBIDDEN_EXT = ['svg', 'pdf', 'webp'].map((e) => '.' + e);
for (const f of allFiles) {
  ok(!FORBIDDEN_EXT.includes(extname(f).toLowerCase()), `forbidden file format in repo: ${f}`);
}
const TEXT_EXT = ['.js', '.mjs', '.json', '.html', '.css', '.md', '.webmanifest', '.yml', '.py'];
const svgTag = '<' + 'svg';
const svgMime = 'image/svg' + '+xml';
const webpExt = '.we' + 'bp';
for (const f of allFiles) {
  if (!TEXT_EXT.includes(extname(f))) continue;
  if (f.startsWith('tests/')) continue; // this scanner builds the patterns dynamically
  const text = readFileSync(join(ROOT, f), 'utf8');
  ok(!text.includes(svgTag), `inline svg markup in ${f}`);
  ok(!text.toLowerCase().includes(svgMime), `svg mime type in ${f}`);
  ok(!text.toLowerCase().includes(webpExt), `webp reference in ${f}`);
}

// ---------- 2. every PNG on disk is a real PNG ----------
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
for (const f of allFiles.filter((f) => extname(f) === '.png')) {
  const head = readFileSync(join(ROOT, f)).subarray(0, 4);
  ok(head.equals(PNG_MAGIC), `not a real PNG: ${f}`);
}

// ---------- 3. every referenced PNG path exists ----------
const refText = allFiles
  .filter((f) => TEXT_EXT.includes(extname(f)))
  .map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
const refs = [...new Set(refText.match(/assets\/png\/[\w/.-]+\.png/g) || [])];
ok(refs.length > 100, `expected >100 png references, found ${refs.length}`);
for (const r of refs) ok(existsSync(join(ROOT, r)), `referenced PNG missing on disk: ${r}`);

// ---------- 4. chapter / scene graph ----------
const sceneIds = Object.keys(scenes);
ok(sceneIds.length >= 45, `need >=45 scenes, have ${sceneIds.length}`);
const chapterSceneIds = chapters.flatMap((c) => c.scenes);
ok(new Set(chapterSceneIds).size === chapterSceneIds.length, 'duplicate scene in chapters');
ok(chapterSceneIds.length === sceneIds.length, 'chapters do not cover every scene exactly once');
for (const ch of chapters) {
  for (const sid of ch.scenes) {
    ok(scenes[sid], `chapter ${ch.id} lists unknown scene ${sid}`);
    ok(scenes[sid]?.chapterId === ch.id, `scene ${sid} chapterId mismatch`);
  }
  ok(existsSync(join(ROOT, ch.card)), `chapter card missing: ${ch.card}`);
  ok(existsSync(join(ROOT, ch.stamp)), `chapter stamp missing: ${ch.stamp}`);
  if (ch.fragment) ok(mystery.fragments.some((f) => f.id === ch.fragment), `chapter ${ch.id} unknown fragment`);
}
ok(chapters.filter((c) => c.fragment).length === 8, 'exactly 8 chapters must award fragments');

let terminals = 0;
for (const [sid, sc] of Object.entries(scenes)) {
  ok(sc.title && sc.objective && sc.copy, `scene ${sid} missing text fields`);
  ok(Array.isArray(sc.dialogue) && sc.dialogue.length >= 2, `scene ${sid} needs dialogue`);
  ok(sc.anomaly && mystery.anomalyCategories.includes(sc.anomaly.category), `scene ${sid} anomaly invalid`);
  ok(existsSync(join(ROOT, sc.background)), `scene ${sid} background missing`);
  ok(sc.hotspots.length >= 1 && sc.hotspots.length <= 8, `scene ${sid} hotspot count out of range`);
  ok(Array.isArray(sc.need) && sc.need.length >= 1, `scene ${sid} has no completion requirements`);
  const hotspotIds = sc.hotspots.map((h) => h.id);
  ok(new Set(hotspotIds).size === hotspotIds.length, `scene ${sid} duplicate hotspot ids`);
  for (const need of sc.need) ok(hotspotIds.includes(need), `scene ${sid} need '${need}' not a hotspot`);
  for (const h of sc.hotspots) {
    if (h.type === 'puzzle') ok(puzzles[h.id], `scene ${sid} references unknown puzzle ${h.id}`);
    if (h.type === 'clue' && h.clue) {
      ok(mystery.clues.some((c) => c.clueId === h.clue), `scene ${sid} unknown clue ${h.clue}`);
    }
    if (h.locked) {
      const [kind, rest] = h.locked.split(':');
      for (const id of rest.split(',')) {
        if (kind === 'solve') ok(puzzles[id], `scene ${sid} lock references unknown puzzle ${id}`);
        if (kind === 'visit') ok(scenes[id], `scene ${sid} lock references unknown scene ${id}`);
      }
      // a locked mandatory hotspot must be unlockable inside the same scene or earlier
      if (sc.need.includes(h.id) && kind === 'solve') {
        for (const id of rest.split(',')) {
          ok(sceneIds.some((s2) => scenes[s2].hotspots.some((hh) => hh.id === id)), `locked need ${h.id} in ${sid} depends on unplaced puzzle ${id}`);
        }
      }
    }
    if (h.view) ok(['leah', 'moshe', 'both'].includes(h.view), `scene ${sid} bad view ${h.view}`);
    // mandatory hotspots must not be view-gated out of reach permanently (view can be toggled, so ok)
  }
  if (sc.next === null) terminals += 1;
  else ok(scenes[sc.next], `scene ${sid} next '${sc.next}' unknown`);
  if (sc.cutsceneAfter) ok(cutscenes.some((c) => c.id === sc.cutsceneAfter), `scene ${sid} unknown cutscene`);
}
ok(terminals === 1, `exactly one terminal scene expected, found ${terminals}`);

// main chain reaches every scene => no mandatory content missable
const seen = new Set();
let cursor = 'p01-paris-apartment';
while (cursor) { seen.add(cursor); cursor = scenes[cursor].next; }
ok(seen.size === sceneIds.length, `scene chain visits ${seen.size}/${sceneIds.length} scenes`);

// ---------- 5. puzzles ----------
const placedPuzzles = new Set(
  Object.values(scenes).flatMap((s) => s.hotspots.filter((h) => h.type === 'puzzle').map((h) => h.id)));
for (const id of Object.keys(puzzles)) ok(placedPuzzles.has(id), `orphan puzzle never placed: ${id}`);
for (const id of placedPuzzles) ok(puzzles[id], `placed puzzle undefined: ${id}`);
let coop = 0, ordered = 0, viewed = 0;
for (const [id, p] of Object.entries(puzzles)) {
  ok(['text', 'choice', 'sequence'].includes(p.type), `puzzle ${id} bad type`);
  ok(Array.isArray(p.hints) && p.hints.length === 3, `puzzle ${id} needs exactly 3 hints`);
  ok(p.why && p.prompt && p.inst && p.title, `puzzle ${id} missing fields`);
  ok(['eye', 'gear', 'compass', 'key', 'hands'].includes(p.seal), `puzzle ${id} bad seal`);
  if (p.type === 'choice') {
    ok(p.options?.length >= 2, `puzzle ${id} needs options`);
    ok(p.options.some(([v]) => v === p.answer), `puzzle ${id} answer not among options`);
  }
  if (p.type === 'sequence') {
    const parts = p.answer.split('|');
    ok(parts.length === p.tokens.length && parts.every((t) => p.tokens.includes(t)),
      `puzzle ${id} sequence answer is not a permutation of its tokens`);
  }
  if (p.type === 'text') ok(p.answer || p.validator === 'hash', `puzzle ${id} has no validator`);
  if (p.awardsClue) ok(mystery.clues.some((c) => c.clueId === p.awardsClue), `puzzle ${id} awards unknown clue`);
  ok(Number.isFinite(p.points) && p.points >= 10, `puzzle ${id} needs a positive points value`);
  // visual renderers are opt-in and must stay consistent with the validator's answer
  if (p.ui) {
    ok(['keypad', 'clocks', 'weights', 'turns', 'letters', 'arrange', 'trips'].includes(p.ui), `puzzle ${id} unknown ui renderer ${p.ui}`);
    ok(p.type === 'text', `puzzle ${id} ui renderer only valid on text puzzles`);
    if (p.ui === 'keypad') ok(/^\d+$/.test(p.answer), `puzzle ${id} keypad needs a purely numeric answer`);
    if (p.ui === 'clocks') {
      ok(p.uiConfig?.clocks?.length === p.answer.split(',').length, `puzzle ${id} clock count must match answer parts`);
      ok(p.answer.split(',').every((t) => /^\d{2}:\d{2}$/.test(t)), `puzzle ${id} clock answer must be HH:MM parts`);
    }
    if (p.ui === 'weights') {
      const parts = p.answer.split(',').map(Number);
      ok(parts.every((w) => p.uiConfig?.weights?.includes(w)), `puzzle ${id} answer weights must exist in the stock`);
      ok(String(parts) === String([...parts].sort((a, b) => b - a)), `puzzle ${id} weights answer must be sorted descending`);
      ok(parts.reduce((a, b) => a + b, 0) === p.uiConfig?.target, `puzzle ${id} weights must sum to the target`);
    }
    if (p.ui === 'turns') {
      ok(p.answer.length === p.uiConfig?.length && /^[LR]+$/.test(p.answer), `puzzle ${id} turns config/answer mismatch`);
    }
    if (p.ui === 'letters') {
      // the bank must contain every answer letter with enough multiplicity
      const bank = [...(p.uiConfig?.bank || '')];
      const need = [...p.answer];
      const pool = [...bank];
      const feasible = need.every((ch) => {
        const at = pool.indexOf(ch);
        if (at < 0) return false;
        pool.splice(at, 1);
        return true;
      });
      ok(feasible, `puzzle ${id} letter bank cannot spell the answer`);
      ok(bank.length > need.length || bank.length === need.length, `puzzle ${id} letter bank too small`);
    }
    if (p.ui === 'arrange') {
      const items = p.uiConfig?.items || [];
      const joiner = p.uiConfig?.joiner ?? '';
      const emits = items.map(([, e]) => e);
      // some ordering of the emits must produce the exact answer
      const answerParts = joiner ? p.answer.split(joiner) : null;
      if (answerParts) {
        ok(String([...emits].sort()) === String([...answerParts].sort()), `puzzle ${id} arrange emits must match answer parts`);
      } else {
        ok([...emits.join('')].sort().join('') === [...p.answer].sort().join(''), `puzzle ${id} arrange emits must spell the answer`);
      }
    }
    if (p.ui === 'trips') {
      const tripsList = p.answer.split(',').map((t) => t.split('+').map(Number));
      ok(String(tripsList.flat().sort((a, b) => a - b)) === String([...(p.uiConfig?.weights || [])].sort((a, b) => a - b)), `puzzle ${id} trips must use every weight once`);
      ok(tripsList.every((t) => t.reduce((a, b) => a + b, 0) <= p.uiConfig?.capacity), `puzzle ${id} a trip exceeds capacity`);
    }
  }
  if (p.coop) coop += 1;
  if (p.ordered) ordered += 1;
  if (p.view) viewed += 1;
}
ok(coop >= 6, `need >=6 cooperative puzzles, have ${coop}`);
ok(ordered >= 4, `need >=4 ordered dual-action puzzles, have ${ordered}`);
ok(viewed >= 8, `need >=8 perspective puzzles, have ${viewed}`);
ok(Object.keys(puzzles).length >= 40, 'need >=40 puzzles overall');

// ---------- 6. mystery clue graph ----------
const clueIds = mystery.clues.map((c) => c.clueId);
ok(new Set(clueIds).size === clueIds.length, 'duplicate clue ids');
const obtainable = new Set();
for (const s of Object.values(scenes)) {
  for (const h of s.hotspots) if (h.type === 'clue' && h.clue) obtainable.add(h.clue);
}
for (const p of Object.values(puzzles)) if (p.awardsClue) obtainable.add(p.awardsClue);
for (const c of mystery.clues) {
  ok(scenes[c.sceneId], `clue ${c.clueId} references unknown scene`);
  ok(chapters.some((ch) => ch.id === c.chapterId), `clue ${c.clueId} unknown chapter`);
  ok(obtainable.has(c.clueId), `unreachable clue (never granted in play): ${c.clueId}`);
  for (const s of [...c.supportsClues, ...c.contradictsClues]) {
    ok(clueIds.includes(s), `clue ${c.clueId} references unknown clue ${s}`);
  }
  const [kind, rest] = c.unlockCondition.split(':');
  ok(['solve', 'visit'].includes(kind), `clue ${c.clueId} bad unlock kind`);
  for (const id of rest.split(',')) {
    ok(kind === 'solve' ? !!puzzles[id] : !!scenes[id], `clue ${c.clueId} unlock ref ${id} unknown`);
  }
  if (c.requiredForFinale) {
    // required clue must come from a hotspot that is in its scene's `need` list,
    // or from a puzzle that is in some scene's `need` list — i.e. not missable.
    const viaHotspot = Object.values(scenes).some((s) =>
      s.hotspots.some((h) => h.clue === c.clueId && s.need.includes(h.id)));
    const viaPuzzle = Object.entries(puzzles).some(([pid, p]) =>
      p.awardsClue === c.clueId && Object.values(scenes).some((s) => s.need.includes(pid)));
    ok(viaHotspot || viaPuzzle, `required clue is missable: ${c.clueId}`);
  }
}
for (const q of mystery.notebookQuestions) {
  ok(q.resolvedBy.length >= 3, `question ${q.id} needs >=3 supporting clues`);
  for (const c of q.resolvedBy) ok(clueIds.includes(c), `question ${q.id} unknown clue ${c}`);
}
ok(/^[0-9a-f]{64}$/.test(mystery.finalValidationHash), 'finalValidationHash is not a sha-256 hex digest');
ok(mystery.clues.filter((c) => c.redHerring).length >= 3, 'need >=3 red herrings');
ok(mystery.fragments.length === 8, 'need exactly 8 fragments');

// ---------- 7. cutscenes ----------
const requiredCs = ['cs01-invitation', 'cs02-erasure', 'cs03-havdalah-rabbit', 'cs04-route',
  'cs05-mumbai-arrival', 'cs06-israel-fragment', 'cs07-wedding', 'cs08-phiphi-question',
  'cs09-boarding-pass', 'cs10-final-reveal'];
for (const id of requiredCs) ok(cutscenes.some((c) => c.id === id), `missing required cutscene ${id}`);
for (const cs of cutscenes) {
  ok(existsSync(join(ROOT, cs.background)), `cutscene bg missing: ${cs.id}`);
  ok(existsSync(join(ROOT, cs.thumbnail)), `cutscene thumb missing: ${cs.id}`);
  ok(cs.steps.length >= 3, `cutscene ${cs.id} too short`);
  for (const step of cs.steps) {
    ok(['narrate', 'say', 'layer', 'clearLayers'].includes(step.t), `cutscene ${cs.id} bad step ${step.t}`);
    if (step.t === 'layer') ok(existsSync(join(ROOT, step.img)), `cutscene layer missing: ${step.img}`);
    if (step.t === 'say') ok(characters[step.who], `cutscene ${cs.id} unknown speaker ${step.who}`);
  }
  const [kind, rest] = cs.unlock.split(':');
  if (kind === 'scene') ok(scenes[rest], `cutscene ${cs.id} unlock scene unknown`);
}

// ---------- 8. save system ----------
{
  const legacy = migrateSave({ scene: 'muscat', solved: ['p1', 'p8'], rabbit: 3, settings: { large: true } });
  ok(legacy && legacy.saveVersion === SAVE_VERSION, 'legacy v0 migration failed');
  ok(legacy.sceneId === 'p04-muscat', 'legacy scene mapping failed');
  ok(legacy.solvedPuzzles.includes('pz-stars'), 'legacy puzzle mapping failed');
  ok(legacy.rabbitMarks.length === 3, 'legacy rabbit count lost');
  ok(legacy.settings.largeText === true, 'legacy settings lost');

  const v1 = migrateSave({ saveVersion: 1, journeySeals: 5, solvedPuzzles: ['pz-clocks'], profileName: 'X' });
  ok(v1 && v1.saveVersion === SAVE_VERSION && v1.solvedPuzzles.includes('pz-clocks'), 'v1 migration failed');
  const v2 = migrateSave({ ...blankSave(2, 'Y'), saveVersion: 2, fragments: undefined });
  ok(v2 && v2.saveVersion === SAVE_VERSION && Array.isArray(v2.fragments), 'v2 migration failed');
  ok(migrateSave({ saveVersion: 99 }) === null, 'future save version must be refused, not erased');
  ok(migrateSave('garbage') === null && deserializeSave('{not json') === null, 'garbage save not rejected');
  const round = deserializeSave(serializeSave(blankSave(1, 'Round')));
  ok(round && round.profileName === 'Round' && round.slotId === 1, 'serialize/deserialize roundtrip failed');

  // v3 → v4: points/tokens economy fields appear, progress retained
  const v3 = migrateSave({
    saveVersion: 3, profileName: 'Old', solvedPuzzles: ['pz-clocks', 'pz-tiles'],
    rabbitMarks: ['rm-p01', 'rm-p02'], unlockedCutscenes: ['cs01-invitation', 'cs05-mumbai-arrival'],
    sceneState: {}, visitedScenes: [], clueBoard: [], journeySeals: { eye: 1, gear: 0, compass: 1, key: 0, hands: 0 },
    fragments: [], stamps: [], drafts: {}, hintsUsed: {}, inventory: [], settings: {}, playTime: 10, view: 'moshe', finished: false
  });
  ok(v3 && v3.saveVersion === SAVE_VERSION, 'v3 migration failed');
  ok(v3.memoryPoints === 70, 'v3 migration retroactive points wrong');
  ok(v3.insightTokens === 2, 'v3 migration retroactive tokens wrong');
  ok(v3.encounteredPuzzles.includes('pz-clocks'), 'v3 migration lost encountered puzzles');
  ok(v3.playedCutscenes.includes('cs05-mumbai-arrival'), 'v3 migration must mark unlocked cutscenes as played');

  // economy invariants: points never negative, floor respected, no duplicate award
  ok(puzzleAward(45, 0) === 45 && puzzleAward(45, 2) === 25, 'puzzleAward arithmetic wrong');
  ok(puzzleAward(45, 99) === 10 && puzzleAward(10, 5) === 10, 'puzzleAward floor broken');
  ok(puzzleAward(undefined, -3) > 0, 'puzzleAward must never go negative');
  const fresh = blankSave();
  ok(fresh.memoryPoints === 0 && fresh.insightTokens >= 1, 'fresh save economy defaults wrong');
  ok(Array.isArray(fresh.playedCutscenes) && Array.isArray(fresh.encounteredPuzzles), 'fresh save missing v4 arrays');
}

// ---------- 9. puzzle validation logic ----------
{
  const p = puzzles['pz-clocks'];
  ok(await checkAnswer(p, ' 11:00, 12:00 , 13:30 '), 'text normalization failed');
  ok(!(await checkAnswer(p, '10:00,12:00,13:30')), 'wrong text accepted');
  const seq = puzzles['pz-corridors'];
  ok(await checkAnswer(seq, ['Power', 'Gate', 'Walkway', 'Belt', 'Sign', 'Elevator']), 'sequence check failed');
  ok(!(await checkAnswer(seq, ['Gate', 'Power', 'Walkway', 'Belt', 'Sign', 'Elevator'])), 'wrong sequence accepted');
  ok(await checkAnswer(puzzles['pz-timetable'], 'B'), 'choice check failed');
  const finalP = puzzles['pz-final-phrase'];
  ok(finalP.validator === 'hash' && !finalP.answer, 'final puzzle must not store a plaintext answer');
  ok(!(await checkAnswer(finalP, 'WRONG GUESS', mystery.finalValidationHash)), 'hash validator accepted junk');
  ok(normalizeAnswer("  ter-mi n'al two!! ") === 'TERMINALTWO', 'normalizer failed');
  ok(conditionMet('solve:pz-clocks', { solvedPuzzles: ['pz-clocks'], visitedScenes: [] }), 'conditionMet solve failed');
  ok(!conditionMet('visit:p03-istanbul', { solvedPuzzles: [], visitedScenes: [] }), 'conditionMet visit failed');
  const demo = blankSave();
  const sc = { ...scenes['p01-paris-apartment'], id: 'p01-paris-apartment' };
  ok(!sceneComplete(sc, demo), 'fresh scene should be incomplete');
  demo.solvedPuzzles.push('pz-invitation', 'pz-packing');
  ok(sceneComplete(sc, demo), 'scene completion check failed');
}

// ---------- 10. spoiler scan: the final phrase must not appear in the repo ----------
{
  const hash = mystery.finalValidationHash;
  const spoilers = [];
  for (const f of allFiles) {
    if (!TEXT_EXT.includes(extname(f))) continue;
    const words = readFileSync(join(ROOT, f), 'utf8').split(/[^A-Za-z']+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      for (let n = 1; n <= 4 && i + n <= words.length; n++) {
        const candidate = normalizeAnswer(words.slice(i, i + n).join(''));
        if (candidate.length < 4 || candidate.length > 24) continue;
        if (await sha256Hex(candidate) === hash) spoilers.push(`${f} (word ${i})`);
      }
    }
  }
  ok(spoilers.length === 0, `plaintext final answer found in: ${spoilers.join(', ')}`);
}

// ---------- 11. shell files ----------
{
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  ok(html.includes('scripts/engine.js'), 'index.html must load the engine');
  ok(html.includes('manifest.webmanifest'), 'index.html must link the manifest');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  for (const m of sw.match(/'(assets\/[^']+|scripts\/[^']+|data\/[^']+)'/g) || []) {
    const p = m.slice(1, -1);
    ok(existsSync(join(ROOT, p)), `sw.js precaches missing file: ${p}`);
  }
  const manifest = json('manifest.webmanifest');
  for (const icon of manifest.icons) ok(existsSync(join(ROOT, icon.src)), `manifest icon missing ${icon.src}`);
}

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
