// Boot, data loading, global state and navigation.
import { el, $, openModal, closeModal, toast } from './ui.js';
import * as saves from './save.js';
import { renderHome, slotPicker } from './home.js';
import { renderScene } from './scene.js';
import { playCutscene, unlockCutscene, galleryPanel } from './cutscene.js';
import { notebookPanel, passportPanel, routePanel, inventoryPanel } from './mystery.js';
import { historyPanel } from './dialogue.js';
import { chapterComplete, sceneComplete } from './core.js';

const DATA_FILES = ['chapters', 'scenes', 'puzzles', 'cutscenes', 'mystery', 'characters'];

const game = {
  data: {},
  chaptersById: {},
  save: null,
  mode: 'home',

  persist() {
    if (this.save?.slotId) saves.writeSlot(this.save.slotId, this.save);
  },
  autosaveNow() {
    if (this.save) saves.autosave(this.save);
  },
  render() {
    if (this.mode === 'home' || !this.save) renderHome(this);
    else renderScene(this);
  },
  closeAllPanels() { closeModal(); },

  startNewGame(save) {
    this.save = save;
    this.mode = 'scene';
    const intro = this.data.cutscenes.cutscenes.find((c) => c.id === 'cs01-invitation');
    playCutscene(intro, this, { onDone: () => { this.autosaveNow(); this.render(); } });
  },

  loadSave(save) {
    this.save = save;
    this.mode = 'scene';
    this.render();
  },

  goHome() {
    if (this.save) { this.persist(); this.autosaveNow(); }
    this.mode = 'home';
    this.render();
  },

  onPuzzleClosed(id, newly) {
    if (newly) this.checkChapterProgress();
    this.render();
  },

  advanceScene(scene) {
    this.persist();
    this.autosaveNow(); // autosave at every scene transition
    const go = () => {
      this.save.sceneId = scene.next;
      this.checkChapterProgress();
      this.persist();
      this.autosaveNow();
      this.preloadScene(scene.next);
      this.render();
    };
    if (scene.cutsceneAfter) {
      const cs = this.data.cutscenes.cutscenes.find((c) => c.id === scene.cutsceneAfter);
      unlockCutscene(cs.id, this.save);
      this.persist();
      playCutscene(cs, this, { onDone: go });
    } else go();
  },

  checkChapterProgress() {
    const scenesById = this.data.scenes.scenes;
    for (const ch of this.data.chapters.chapters) {
      if (chapterComplete(ch, scenesById, this.save)) {
        if (!this.save.stamps.includes(ch.id)) {
          this.save.stamps.push(ch.id);
          toast(`Passport stamped: ${ch.title.split('—')[0].trim()}`);
        }
        if (ch.fragment && !this.save.fragments.includes(ch.fragment)) {
          this.save.fragments.push(ch.fragment);
          const f = this.data.mystery.fragments.find((x) => x.id === ch.fragment);
          if (f) toast(`${f.label} secured`);
        }
      }
    }
    this.persist();
  },

  preloadScene(sceneId) {
    const scene = this.data.scenes.scenes[sceneId];
    if (!scene) return;
    const img = new Image();
    img.src = scene.background;
    if (scene.next) {
      const following = this.data.scenes.scenes[scene.next];
      if (following) { const img2 = new Image(); img2.src = following.background; }
    }
  },

  showEnding() {
    this.save.finished = true;
    this.persist();
    this.autosaveNow();
    const root = $('#screen');
    root.innerHTML = '';
    root.append(el('section', { class: 'final' },
      el('article', { class: 'final-card' },
        el('img', { src: 'assets/png/ui/app-icon.png', alt: 'Hamsa', width: 96, height: 96 }),
        el('p', { class: 'eyebrow' }, 'The journey is whole'),
        el('h1', {}, 'Our Story'),
        el('p', { class: 'memory' }, 'The missing flight departed long ago, without him — exactly as it always did, the evening he chose a question over a boarding gate. The rabbit marked every goodbye they skipped. The Hamsa kept their true memories safe. And every landscape from Tel Aviv to Seoul became the stage for their story.'),
        el('p', {}, `${this.save.rabbitMarks.length} Rabbit Marks · ${this.save.solvedPuzzles.length} puzzles · every question answered.`),
        el('button', { class: 'btn primary', onclick: () => this.goHome() }, 'Return to the title'))));
  },

  openChapters() {
    const scenesById = this.data.scenes.scenes;
    const save = this.save || saves.readAutosave();
    if (!save) return;
    const wrap = el('div', { class: 'section' },
      el('p', { class: 'eyebrow' }, 'Journey chapters'),
      el('h2', {}, 'Chapters'));
    const cards = el('div', { class: 'chapter-list' });
    let reachable = true;
    for (const ch of this.data.chapters.chapters) {
      const started = ch.scenes.some((sid) => save.visitedScenes.includes(sid));
      const done = chapterComplete(ch, scenesById, save);
      const unlocked = reachable && (started || done);
      const card = el('button', {
        class: `chapter-card${done ? ' done' : ''}${unlocked ? '' : ' locked'}`,
        disabled: unlocked ? null : '',
        onclick: () => {
          const target = ch.scenes.find((sid) => !sceneComplete({ ...scenesById[sid], id: sid }, save)) || ch.scenes[0];
          this.save = save;
          this.save.sceneId = target;
          this.mode = 'scene';
          closeModal();
          this.persist();
          this.render();
        }
      },
        el('img', { src: ch.card, alt: '', width: 128, height: 72 }),
        el('span', {}, el('strong', {}, unlocked ? ch.title : '???'),
          el('small', {}, unlocked ? ch.subtitle : 'Keep traveling to unlock')));
      cards.append(card);
      if (!done) reachable = false;
    }
    wrap.append(cards);
    openModal(wrap, { label: 'Chapters' });
  },

  openNotebook() { openModal(notebookPanel(this), { label: 'Mystery Notebook' }); },

  openSettings(fromHome = false) {
    const s = this.save?.settings || saves.blankSave().settings;
    const rows = [
      ['sound', 'Sound cues'], ['music', 'Music'], ['captions', 'Captions'],
      ['largeText', 'Larger text'], ['contrast', 'High contrast'],
      ['reducedMotion', 'Reduced motion'], ['hotspotHighlight', 'Highlight hotspots'],
      ['clock24', '24-hour clock']
    ];
    const wrap = el('div', { class: 'section' },
      el('p', { class: 'eyebrow' }, 'Options'),
      el('h2', {}, 'Settings'));
    const list = el('div', { class: 'cards' });
    for (const [keyName, label] of rows) {
      const input = el('input', { type: 'checkbox' });
      input.checked = !!s[keyName];
      input.addEventListener('change', () => {
        s[keyName] = input.checked;
        applySettings(s);
        this.persist();
      });
      list.append(el('label', { class: 'card settings-row' }, label, input));
    }
    wrap.append(list);
    openModal(wrap, { label: 'Settings' });
  }
};

function applySettings(s) {
  document.body.classList.toggle('large', !!s.largeText);
  document.body.classList.toggle('contrast', !!s.contrast);
  document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
}

async function loadData() {
  const results = await Promise.all(
    DATA_FILES.map((name) => fetch(`data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load data/${name}.json`);
      return r.json();
    }))
  );
  DATA_FILES.forEach((name, i) => { game.data[name] = results[i]; });
  game.data.characters = game.data.characters.characters;
  game.data.puzzles = game.data.puzzles.puzzles;
  for (const ch of game.data.chapters.chapters) game.chaptersById[ch.id] = ch;
}

function bindTopBar() {
  $('#homeBtn').addEventListener('click', () => game.goHome());
  $('#passportBtn').addEventListener('click', () => game.save && openModal(passportPanel(game), { label: 'Passport' }));
  $('#mapBtn').addEventListener('click', () => game.save && openModal(routePanel(game), { label: 'Route' }));
  $('#journalBtn').addEventListener('click', () => game.save && game.openNotebook());
  $('#bagBtn').addEventListener('click', () => game.save && openModal(inventoryPanel(game), { label: 'Inventory' }));
  $('#settingsBtn').addEventListener('click', () => game.openSettings());
  $('#logBtn').addEventListener('click', () => openModal(historyPanel(), { label: 'Dialogue history' }));
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });
}

function startPlaytimeClock() {
  setInterval(() => {
    if (game.save && game.mode === 'scene') {
      game.save.playTime += 10;
      game.persist();
    }
  }, 10000);
}

async function boot() {
  const loading = $('#loading');
  try {
    await loadData();
  } catch (err) {
    loading.textContent = 'Could not load the journey data. Please reload.';
    throw err;
  }
  saves.adoptLegacySave();
  bindTopBar();
  startPlaytimeClock();
  applySettings(saves.readAutosave()?.settings || saves.blankSave().settings);
  loading.remove();
  game.render();
  window.addEventListener('beforeunload', () => { if (game.save) { game.persist(); game.autosaveNow(); } });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
