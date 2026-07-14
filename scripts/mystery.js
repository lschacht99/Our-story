// Player-facing investigation surfaces: Mystery Notebook, Hamsa Nomads
// Passport, route map, inventory and Rabbit Marks.
import { el, formatTime } from './ui.js';
import { sceneComplete, chapterComplete, overallProgress } from './core.js';

export function notebookPanel(game) {
  const { save, data } = game;
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Investigation'),
    el('h2', {}, 'Mystery Notebook'));

  const qs = el('div', { class: 'cards' });
  for (const q of data.mystery.notebookQuestions) {
    const found = q.resolvedBy.filter((c) => save.clueBoard.includes(c)).length;
    const done = found >= Math.min(3, q.resolvedBy.length);
    qs.append(el('div', { class: `card${done ? ' done' : ''}` },
      el('strong', {}, `${done ? '✓ ' : ''}${q.text}`),
      el('small', {}, `${found}/${q.resolvedBy.length} supporting clues`)));
  }
  wrap.append(qs, el('h3', {}, 'Clue board'));

  const board = el('div', { class: 'cards' });
  const collected = data.mystery.clues.filter((c) => save.clueBoard.includes(c.clueId));
  for (const clue of collected) {
    board.append(el('div', { class: `card${clue.redHerring && save.finished ? ' herring' : ''}` },
      el('strong', {}, clue.visibleForm),
      el('small', {}, `Category: ${clue.category}${save.finished && clue.redHerring ? ' · red herring' : ''}`)));
  }
  if (!collected.length) board.append(el('p', {}, 'No clues yet. Tap the glowing marks in each scene.'));
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
    el('h2', {}, 'Inventory'));
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
      ` ${game.save.rabbitMarks.length} collected — the rabbit only appears at goodbyes that didn't happen.`));
  return wrap;
}
