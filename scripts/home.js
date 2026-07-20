// Illustrated home screen and DS-style save-slot management.
import { el, $, openModal, closeModal, toast, confirmDialog, formatTime } from './ui.js';
import * as saves from './save.js';
import { overallProgress } from './core.js';
import { galleryPanel } from './cutscene.js';

export function renderHome(game) {
  const root = $('#screen');
  root.innerHTML = '';
  $('#objectiveText').textContent = 'Begin the journey';
  const hasAnySave = saves.SLOT_IDS.some((id) => saves.readSlot(id) || saves.readSlotBackup(id)) || saves.readAutosave();
  const latest = latestSave();
  const homeSettings = saves.readPreferences() || latest?.settings || saves.blankSave().settings;
  game.audio?.setChapter('home', homeSettings.music);

  const secondaryMenu = el('div', {
    class: 'home-more-menu', id: 'home-more-menu', hidden: ''
  },
    menuBtn('Load Save', !hasAnySave, () => slotPicker(game, 'load')),
    menuBtn('Chapters', !latest, () => latest && game.openChapters()),
    menuBtn('Mystery Notebook', !latest, () => latest && (game.loadSave(latest), game.openNotebook())),
    menuBtn('Cutscenes', !latest, () => {
      if (!latest) return;
      game.save = { ...latest, settings: { ...latest.settings, ...(saves.readPreferences() || {}) } };
      openModal(galleryPanel(game, null), { label: 'Cutscene gallery' });
    }),
    menuBtn('Options', false, () => game.openSettings(true)),
    menuBtn('Credits', false, () => credits()));

  const moreBtn = el('button', {
    class: 'menu-btn menu-more',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': secondaryMenu.id,
    onclick: () => {
      const willOpen = secondaryMenu.hidden;
      secondaryMenu.hidden = !willOpen;
      moreBtn.setAttribute('aria-expanded', String(willOpen));
      moreBtn.classList.toggle('is-open', willOpen);
    }
  }, 'More');

  const menu = el('nav', { class: 'home-menu', 'aria-label': 'Main menu' },
    el('div', { class: 'home-primary-actions' },
      menuBtn('Continue', !latest, () => { if (latest) game.loadSave(latest); }),
      menuBtn('New Game', false, () => slotPicker(game, 'new')),
      moreBtn),
    secondaryMenu);

  const summary = latest
    ? el('p', { class: 'home-summary' },
        `${latest.profileName} · ${game.chaptersById[latest.chapterId]?.title?.split('—')[0].trim() || ''} · ` +
        `${formatTime(latest.playTime)} · ${overallProgress(game.data.chapters.chapters, game.data.scenes.scenes, latest).pct}% · ` +
        `${latest.rabbitMarks.length} rabbit marks`)
    : el('p', { class: 'home-summary' }, 'A cooperative travel mystery for two nomads and one rabbit.');

  root.append(el('section', { class: 'title-screen', 'aria-labelledby': 'home-title' },
    el('img', {
      class: 'home-key-art',
      src: 'assets/png/ui/title-key-art.png',
      alt: 'Leah and Moshé follow a dashed travel route beside a white rabbit and a half-erased airline ticket.',
      decoding: 'async',
      fetchpriority: 'high'
    }),
    el('button', {
      class: 'home-options-btn',
      type: 'button',
      'aria-label': 'Options',
      title: 'Options',
      onclick: () => game.openSettings(true)
    }, el('img', { src: 'assets/png/ui/icon-settings.png', alt: '' })),
    el('article', { class: 'title-card' },
      el('p', { class: 'eyebrow' }, 'A cooperative travel mystery'),
      el('h1', { id: 'home-title' }, 'Our Story ', el('span', {}, 'The Missing Flight')),
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
    const backup = saves.readSlotBackup(id);
    const chapter = save ? game.chaptersById[save.chapterId] : null;
    const prog = save ? overallProgress(game.data.chapters.chapters, game.data.scenes.scenes, save) : null;
    const card = el('div', { class: `slot${save ? '' : ' empty'}` },
      el('img', { src: chapter ? chapter.card : 'assets/png/ui/paper.png', alt: '', width: 96, height: 54 }),
      el('div', { class: 'slot-info' },
        el('strong', {}, save ? save.profileName : `Slot ${id} — empty`),
        save ? el('small', {}, `${chapter?.title.split('—')[0].trim()} · ${prog.pct}% · ${formatTime(save.playTime)} · ${save.solvedPuzzles.length} puzzles · ${save.rabbitMarks.length} ♧${save.finished ? ' · completed' : ''}`) : null,
        save?.lastSavedAt ? el('small', {}, `Saved ${new Date(save.lastSavedAt).toLocaleString()}`) : null),
      el('div', { class: 'slot-actions' }, ...slotActions(game, mode, id, save, backup)));
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

export function savePanel(game) {
  if (!game.save) return;
  const save = game.save;
  const slotId = Number(save.slotId);
  const backup = saves.readSlotBackup(slotId);
  const wrap = el('div', { class: 'section save-center' },
    el('p', { class: 'eyebrow' }, 'Progress and recovery'),
    el('h2', {}, 'Save Center'),
    el('div', { class: 'save-status', role: 'status' },
      el('img', { src: 'assets/png/ui/icon-save.png', alt: '', width: 44, height: 44 }),
      el('div', {},
        el('strong', {}, `${save.profileName} · Slot ${slotId}`),
        el('small', {}, save.lastSavedAt ? `Saved ${new Date(save.lastSavedAt).toLocaleString()}` : 'Not saved yet'))),
    el('p', {}, 'The game saves at scene changes and solved puzzles. Use Save now before closing the browser or switching devices.'),
    el('div', { class: 'save-center-actions' },
      el('button', {
        class: 'btn primary', onclick: () => {
          const when = saves.manualSave(save);
          toast(when ? 'Journey saved safely' : 'Choose a save slot first');
          if (when) { closeModal(); savePanel(game); }
        }
      }, 'Save now'),
      el('button', { class: 'btn', onclick: () => { closeModal(); slotPicker(game, 'load'); } }, 'Manage slots'),
      el('button', { class: 'btn', onclick: () => downloadSave(slotId) }, 'Download backup'),
      el('button', {
        class: 'btn', disabled: backup ? null : '',
        onclick: () => backup && confirmDialog('Restore the previous version of this slot?', () => {
          const restored = saves.restoreSlotBackup(slotId);
          if (restored) { closeModal(); game.loadSave(restored); toast('Previous save restored'); }
        }, { danger: true })
      }, 'Restore previous')));
  openModal(wrap, { label: 'Save Center' });
}

function downloadSave(slotId) {
  const text = saves.exportSlot(slotId);
  if (!text) { toast('Save the journey before downloading a backup'); return; }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `our-story-slot-${slotId}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function slotActions(game, mode, id, save, backup) {
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
          downloadSave(id);
        }
      }, 'Export'),
      el('button', {
        class: 'btn small danger',
        onclick: () => confirmDialog(`Delete "${save.profileName}" forever?`, () => { saves.deleteSlot(id); slotPicker(game, mode); }, { danger: true, requireDouble: true })
      }, 'Delete'));
  }
  if (mode === 'load' && backup) {
    actions.push(el('button', {
      class: 'btn small', onclick: () => confirmDialog(`Recover the previous version of slot ${id}?`, () => {
        const restored = saves.restoreSlotBackup(id);
        if (restored) { closeModal(); game.loadSave(restored); toast('Previous save restored'); }
      })
    }, save ? 'Recover previous' : 'Recover backup'));
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
