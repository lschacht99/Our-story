// Illustrated home screen and DS-style save-slot management.
import { el, $, openModal, closeModal, toast, confirmDialog, formatTime } from './ui.js';
import * as saves from './save.js';
import { overallProgress } from './core.js';
import { galleryPanel } from './cutscene.js';

export function renderHome(game) {
  const root = $('#screen');
  root.innerHTML = '';
  $('#objectiveText').textContent = 'Begin the journey';
  const hasAnySave = saves.SLOT_IDS.some((id) => saves.readSlot(id)) || saves.readAutosave();
  const latest = latestSave();

  const menu = el('nav', { class: 'home-menu', 'aria-label': 'Main menu' },
    menuBtn('Continue', !latest, () => { if (latest) game.loadSave(latest); }),
    menuBtn('New Game', false, () => slotPicker(game, 'new')),
    menuBtn('Load Save', !hasAnySave, () => slotPicker(game, 'load')),
    menuBtn('Chapters', !latest, () => latest && game.openChapters()),
    menuBtn('Mystery Notebook', !latest, () => latest && (game.loadSave(latest), game.openNotebook())),
    menuBtn('Cutscenes', !latest, () => {
      if (!latest) return;
      game.save = latest;
      openModal(galleryPanel(game, null), { label: 'Cutscene gallery' });
    }),
    menuBtn('Options', false, () => game.openSettings(true)),
    menuBtn('Credits', false, () => credits()));

  const summary = latest
    ? el('p', { class: 'home-summary' },
        `${latest.profileName} · ${game.chaptersById[latest.chapterId]?.title?.split('—')[0].trim() || ''} · ` +
        `${formatTime(latest.playTime)} · ${overallProgress(game.data.chapters.chapters, game.data.scenes.scenes, latest).pct}% · ` +
        `${latest.rabbitMarks.length} rabbit marks`)
    : el('p', { class: 'home-summary' }, 'A cooperative travel mystery for two nomads and one rabbit.');

  root.append(el('section', { class: 'title-screen' },
    el('article', { class: 'title-card' },
      el('img', { class: 'key-art', src: 'assets/png/ui/title-key-art.png', alt: 'Leah and Moshé over a dashed travel route, a white rabbit and a half-erased ticket' }),
      el('p', { class: 'eyebrow' }, 'A cooperative travel mystery'),
      el('h1', {}, 'Our Story ', el('span', {}, 'The Missing Flight')),
      summary, menu)));
}

function menuBtn(label, disabled, onclick) {
  return el('button', { class: 'menu-btn', disabled: disabled ? '' : null, onclick }, label);
}

function latestSave() {
  const candidates = [saves.readAutosave(), ...saves.SLOT_IDS.map((id) => saves.readSlot(id))]
    .filter(Boolean);
  candidates.sort((a, b) => String(b.lastSavedAt || '').localeCompare(String(a.lastSavedAt || '')));
  return candidates[0] || null;
}

export function slotPicker(game, mode) {
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, mode === 'new' ? 'Choose a slot' : 'Load a journey'),
    el('h2', {}, mode === 'new' ? 'New Game' : 'Save Slots'));
  const list = el('div', { class: 'slots' });

  for (const id of saves.SLOT_IDS) {
    const save = saves.readSlot(id);
    const chapter = save ? game.chaptersById[save.chapterId] : null;
    const prog = save ? overallProgress(game.data.chapters.chapters, game.data.scenes.scenes, save) : null;
    const card = el('div', { class: `slot${save ? '' : ' empty'}` },
      el('img', { src: chapter ? chapter.card : 'assets/png/ui/paper.png', alt: '', width: 96, height: 54 }),
      el('div', { class: 'slot-info' },
        el('strong', {}, save ? save.profileName : `Slot ${id} — empty`),
        save ? el('small', {}, `${chapter?.title.split('—')[0].trim()} · ${prog.pct}% · ${formatTime(save.playTime)} · ${save.solvedPuzzles.length} puzzles · ${save.rabbitMarks.length} ♧${save.finished ? ' · completed' : ''}`) : null,
        save?.lastSavedAt ? el('small', {}, `Saved ${new Date(save.lastSavedAt).toLocaleString()}`) : null),
      el('div', { class: 'slot-actions' }, ...slotActions(game, mode, id, save)));
    list.append(card);
  }

  const autosaveInfo = saves.readAutosave();
  if (autosaveInfo && mode === 'load') {
    list.append(el('div', { class: 'slot autosave' },
      el('div', { class: 'slot-info' },
        el('strong', {}, 'Autosave / recovery'),
        el('small', {}, `${autosaveInfo.profileName} · saved ${autosaveInfo.lastSavedAt ? new Date(autosaveInfo.lastSavedAt).toLocaleString() : 'recently'}`)),
      el('div', { class: 'slot-actions' },
        el('button', { class: 'btn small primary', onclick: () => { closeModal(); game.loadSave(autosaveInfo); } }, 'Recover'))));
  }

  wrap.append(list, importRow(game));
  openModal(wrap, { label: 'Save slots' });
}

function slotActions(game, mode, id, save) {
  const actions = [];
  if (mode === 'new') {
    actions.push(el('button', {
      class: 'btn small primary', onclick: () => {
        const start = () => {
          const name = prompt('Name this journey:', 'Leah & Moshé') || 'Leah & Moshé';
          const s = saves.newGame(id, name.slice(0, 24));
          closeModal();
          game.startNewGame(s);
        };
        if (save) confirmDialog(`Overwrite "${save.profileName}"? This cannot be undone.`, start, { danger: true, requireDouble: true });
        else start();
      }
    }, save ? 'Overwrite' : 'Start here'));
  }
  if (save) {
    if (mode === 'load') {
      actions.push(el('button', { class: 'btn small primary', onclick: () => { closeModal(); game.loadSave(save); } }, 'Load'));
    }
    actions.push(
      el('button', { class: 'btn small', onclick: () => { const n = prompt('New name:', save.profileName); if (n) { saves.renameSlot(id, n); slotPicker(game, mode); } } }, 'Rename'),
      el('button', {
        class: 'btn small', onclick: () => {
          const to = Number(prompt('Copy to slot (1–3):', ''));
          if (saves.SLOT_IDS.includes(to) && to !== id) {
            const target = saves.readSlot(to);
            const doCopy = () => { saves.copySlot(id, to); slotPicker(game, mode); toast(`Copied to slot ${to}`); };
            if (target) confirmDialog(`Slot ${to} holds "${target.profileName}". Overwrite it?`, doCopy, { danger: true, requireDouble: true });
            else doCopy();
          }
        }
      }, 'Copy'),
      el('button', {
        class: 'btn small', onclick: () => {
          const text = saves.exportSlot(id);
          const blob = new Blob([text], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `our-story-slot-${id}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }, 'Export'),
      el('button', {
        class: 'btn small danger',
        onclick: () => confirmDialog(`Delete "${save.profileName}" forever?`, () => { saves.deleteSlot(id); slotPicker(game, mode); }, { danger: true, requireDouble: true })
      }, 'Delete'));
  }
  return actions;
}

function importRow(game) {
  const input = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Import save file', style: 'display:none' });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    const slot = Number(prompt('Import into slot (1–3):', '1'));
    if (!saves.SLOT_IDS.includes(slot)) return;
    const doImport = () => {
      const save = saves.importToSlot(slot, text);
      if (save) { toast('Save imported'); closeModal(); game.loadSave(save); }
      else toast('That file is not a valid save.');
    };
    const existing = saves.readSlot(slot);
    if (existing) confirmDialog(`Slot ${slot} holds "${existing.profileName}". Overwrite it?`, doImport, { danger: true, requireDouble: true });
    else doImport();
  });
  return el('div', { class: 'row' },
    el('button', { class: 'btn small', onclick: () => input.click() }, 'Import save (JSON)'), input);
}

function credits() {
  openModal(el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Our Story — The Missing Flight'),
    el('h2', {}, 'Credits'),
    el('p', {}, 'Based on the true travels of Leah and Moshé, from a Havdalah table in Tel Aviv to a riverside in Seoul.'),
    el('p', {}, 'Every landscape they crossed became the stage for their story.'),
    el('p', {}, 'Design, writing and code: the Hamsa Nomads team. All artwork is original PNG art.'),
    el('button', { class: 'btn primary', onclick: closeModal }, 'Back')
  ), { label: 'Credits' });
}
