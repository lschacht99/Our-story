// Data-driven cutscene player: PNG layers over a PNG background,
// tap-to-advance, skip, reduced-motion aware. Replay never mutates a save.
import { el, $ } from './ui.js';

export function playCutscene(cs, game, { replay = false, onDone } = {}) {
  const root = $('#screen');
  const reduced = game.save?.settings.reducedMotion ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const layerHost = el('div', { class: 'cutscene-layers' });
  const textHost = el('div', { class: 'cutscene-text', 'aria-live': 'polite' });
  let i = 0;
  let finished = false;
  game.audio?.setChapter('cinematic', game.save?.settings.music !== false);

  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.remove();
    game.audio?.setChapter(game.mode === 'home' ? 'home' : game.save?.chapterId, game.save?.settings.music !== false);
    onDone?.();
  };

  const advance = () => {
    if (i >= cs.steps.length) { finish(); return; }
    const step = cs.steps[i];
    i += 1;
    if (step.t === 'layer') {
      const img = el('img', {
        class: `cutscene-layer ${reduced ? '' : step.anim || 'fadein'}`,
        src: step.img, alt: '',
        style: `left:${step.x}%;top:${step.y}%;--cs-scale:${step.scale || 1}`
      });
      layerHost.append(img);
      advance(); // layers appear alongside the next text step
      return;
    }
    if (step.t === 'clearLayers') { layerHost.innerHTML = ''; advance(); return; }
    textHost.innerHTML = '';
    if (step.t === 'narrate') {
      textHost.append(el('p', { class: 'narration' }, step.text));
    } else if (step.t === 'say') {
      const info = game.data.characters[step.who] || { name: step.who };
      textHost.append(el('div', { class: 'cs-line' },
        info.portrait ? el('img', { src: info.portrait, alt: '', width: 48, height: 48 }) : null,
        el('div', {}, el('strong', {}, info.name), el('p', {}, step.text))));
    }
  };

  const overlay = el('div', {
    class: 'cutscene', role: 'dialog', 'aria-label': `Cutscene: ${cs.title}`,
    style: `background-image:url('${cs.background}')`,
    onclick: advance
  },
    layerHost, textHost,
    el('div', { class: 'cutscene-bar' },
      el('span', { class: 'cutscene-title' }, cs.title + (replay ? ' · replay' : '')),
      el('button', {
        class: 'btn small', 'aria-label': 'Skip cutscene',
        onclick: (e) => { e.stopPropagation(); finish(); }
      }, 'Skip ▸▸')));

  root.append(overlay);
  advance();
}

export function unlockCutscene(id, save) {
  if (!save.unlockedCutscenes.includes(id)) save.unlockedCutscenes.push(id);
}

export function galleryPanel(game, openScene) {
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Memory reel'),
    el('h2', {}, 'Cutscenes'));
  const grid = el('div', { class: 'gallery' });
  for (const cs of game.data.cutscenes.cutscenes) {
    const unlocked = game.save.unlockedCutscenes.includes(cs.id);
    const card = el('button', {
      class: `gallery-card${unlocked ? '' : ' locked'}`,
      'aria-label': unlocked ? `Replay ${cs.title}` : 'Locked cutscene',
      onclick: () => {
        if (!unlocked) return;
        // Replay against a shallow copy marker: player state is never written.
        game.closeAllPanels();
        playCutscene(cs, game, { replay: true, onDone: () => game.render() });
      }
    },
      el('img', { src: cs.thumbnail, alt: '', width: 160, height: 90 }),
      el('span', {}, unlocked ? cs.title : '??? — keep traveling'));
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
}
