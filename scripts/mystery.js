// Player-facing investigation surfaces: Mystery Notebook, puzzle index,
// Hamsa Nomads Passport, route map, inventory and Rabbit Marks.
import { el, formatTime } from './ui.js';
import { sceneComplete, chapterComplete, overallProgress } from './core.js';
import { openPuzzle } from './puzzle.js';

function totalMemoryPoints(save) {
  return (save.solvedPuzzles || []).reduce((sum, id) => sum + Number(save.puzzleScores?.[id] || 0), 0);
}

export function notebookPanel(game) {
  const { save, data } = game;
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Investigation'),
    el('h2', {}, 'Mystery Notebook'),
    el('p', { class: 'notebook-totals' },
      `${totalMemoryPoints(save)} Memory Points · ${save.insightTokens} Insight Tokens · ${save.solvedPuzzles.length}/${Object.keys(data.puzzles).length} puzzles solved`));

  const qs = el('div', { class: 'cards' });
  for (const q of data.mystery.notebookQuestions) {
    const found = q.resolvedBy.filter((c) => save.clueBoard.includes(c)).length;
    const done = found >= Math.min(3, q.resolvedBy.length);
    qs.append(el('div', { class: `card${done ? ' done' : ''}` },
      el('strong', {}, `${done ? '✓ ' : ''}${q.text}`),
      el('small', {}, `${found}/${q.resolvedBy.length} supporting clues`)));
  }
  wrap.append(qs, el('h3', {}, 'Puzzle Index'));

  const puzzleIndex = el('div', { class: 'puzzle-index' });
  const encountered = (save.encounteredPuzzles || [])
    .map((id) => [id, data.puzzles[id]])
    .filter(([, puzzle]) => puzzle)
    .sort((a, b) => Number(a[1].n) - Number(b[1].n));
  for (const [id, puzzle] of encountered) {
    const solved = save.solvedPuzzles.includes(id);
    puzzleIndex.append(el('button', {
      type: 'button', class: `puzzle-index-card${solved ? ' solved' : ''}`,
      onclick: () => openPuzzle(id, game)
    },
      el('span', { class: 'puzzle-number' }, String(puzzle.n).padStart(2, '0')),
      el('span', { class: 'puzzle-index-copy' },
        el('strong', {}, puzzle.title),
        el('small', {}, solved
          ? `Solved · ${save.puzzleScores[id] || 0} Memory Points`
          : `${puzzle.cat} · unsolved`)),
      el('span', { class: 'puzzle-index-status' }, solved ? '✓' : '›')));
  }
  if (!encountered.length) puzzleIndex.append(el('p', {}, 'Puzzles appear here after you discover them in a scene.'));
  wrap.append(puzzleIndex, el('h3', {}, 'Clue board'));

  const board = el('div', { class: 'cards' });
  const collected = data.mystery.clues.filter((c) => save.clueBoard.includes(c.clueId));
  for (const clue of collected) {
    board.append(el('div', { class: `card${clue.redHerring && save.finished ? ' herring' : ''}` },
      el('strong', {}, clue.visibleForm),
      el('small', {}, `Category: ${clue.category}${save.finished && clue.redHerring ? ' · red herring' : ''}`)));
  }
  if (!collected.length) board.append(el('p', {}, 'No clues yet. Investigate objects and unusual details in each scene.'));
  wrap.append(board, el('h3', {}, 'Fragments'));

  const frags = el('div', { class: 'cards' });
  for (const f of data.mystery.fragments) {
    const has = save.fragments.includes(f.id);
    frags.append(el('div', { class: `card${has ? ' done' : ''}` },
      el('strong', {}, has ? `${f.label}` : `${f.label} — sealed`),
      has ? el('p', {}, f.text) : null));
  }
  wrap.append(frags);
  return wrap;
}

export function passportPanel(game) {
  const { save, data } = game;
  const scenesById = data.scenes.scenes;
  const prog = overallProgress(data.chapters.chapters, scenesById, save);
  const wrap = el('div', { class: 'section' },
    el('div', { class: 'passport-cover' },
      el('img', { src: 'assets/png/ui/app-icon.png', alt: '', width: 64, height: 64 }),
      el('h2', {}, 'Hamsa Nomads Passport'),
      el('p', {}, `${save.profileName} · ${prog.pct}% of the journey`)));
  const grid = el('div', { class: 'stamp-grid' });
  for (const ch of data.chapters.chapters) {
    const stamped = save.stamps.includes(ch.id);
    grid.append(el('div', { class: `stamp${stamped ? '' : ' locked'}` },
      el('img', { src: ch.stamp, alt: '', width: 56, height: 56 }),
      el('strong', {}, ch.title.split('—')[0].trim())));
  }
  const seals = el('p', {}, `Seals — Eye ${save.journeySeals.eye} · Gear ${save.journeySeals.gear} · Compass ${save.journeySeals.compass} · Key ${save.journeySeals.key} · Two Hands ${save.journeySeals.hands}`);
  wrap.append(grid, seals,
    el('p', {}, el('strong', {}, `${save.solvedPuzzles.length}`), ' puzzles · ',
      el('strong', {}, `${totalMemoryPoints(save)}`), ' Memory Points · ',
      el('strong', {}, `${save.insightTokens}`), ' Insight Tokens · ',
      el('strong', {}, `${save.rabbitMarks.length}`), ' Rabbit Marks · ',
      el('strong', {}, formatTime(save.playTime)), ' traveled'));
  return wrap;
}

export function routePanel(game) {
  const { save, data } = game;
  const scenesById = data.scenes.scenes;
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'The long way east'),
    el('h2', {}, 'Journey Route'));
  const route = el('div', { class: 'route' });
  for (const ch of data.chapters.chapters) {
    const done = chapterComplete(ch, scenesById, save);
    const active = ch.id === save.chapterId;
    const scenesDone = ch.scenes.filter((sid) => sceneComplete({ ...scenesById[sid], id: sid }, save)).length;
    route.append(el('div', { class: `stop${done ? ' done' : ''}${active ? ' active' : ''}` },
      el('strong', {}, ch.title.split('—')[0].trim()),
      el('small', {}, `${ch.subtitle} · ${scenesDone}/${ch.scenes.length}`)));
  }
  wrap.append(route);
  return wrap;
}

export function inventoryPanel(game) {
  const { save } = game;
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Satchel'),
    el('h2', {}, 'Inventory'),
    el('p', { class: 'insight-wallet' }, `${save.insightTokens} Insight Tokens available for puzzle hints`));
  const list = el('div', { class: 'cards' });
  const items = {
    hamsa: { name: 'Brass Hamsa', desc: 'Sharon’s anchor. Its eye clears on true memories.' }
  };
  const owned = [...save.inventory];
  if (save.clueBoard.includes('clue-hamsa-eye') && !owned.includes('hamsa')) owned.push('hamsa');
  for (const id of owned) {
    const it = items[id] || { name: id, desc: '' };
    list.append(el('div', { class: 'card' }, el('strong', {}, it.name), el('small', {}, it.desc)));
  }
  if (!owned.length) list.append(el('p', {}, 'The satchel is empty — for now.'));
  wrap.append(list,
    el('h3', {}, 'Rabbit Marks'),
    el('p', {},
      el('img', { src: 'assets/png/collectibles/rabbit-mark.png', alt: '', width: 28, height: 28 }),
      ` ${game.save.rabbitMarks.length} collected — each new mark grants one Insight Token.`));
  return wrap;
}
