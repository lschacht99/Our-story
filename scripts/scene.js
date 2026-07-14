// Point-and-click scene renderer: painted background, tappable characters,
// concealed investigation hotspots, directional travel and perspective switching.
import { el, $, openModal, closeModal, toast } from './ui.js';
import { playDialogue } from './dialogue.js';
import { openPuzzle } from './puzzle.js';
import { conditionMet, sceneComplete } from './core.js';

const HOTSPOT_ICON = { puzzle: '?', clue: '!', rabbit: '♧', item: '▣', observe: '◉', anomaly: '≠' };

export function renderScene(game) {
  const save = game.save;
  const sceneData = game.data.scenes.scenes[save.sceneId];
  if (!sceneData) return;
  const scene = { ...sceneData, id: save.sceneId };
  const chapter = game.chaptersById[scene.chapterId];
  save.chapterId = scene.chapterId;
  if (!save.visitedScenes.includes(scene.id)) {
    save.visitedScenes.push(scene.id);
    game.persist();
  }
  const state = save.sceneState[scene.id] ??= { found: [] };
  const root = $('#screen');
  root.innerHTML = '';

  const stage = el('div', {
    class: 'stage investigation-stage', style: `background-image:url('${scene.background}')`,
    role: 'img', 'aria-label': `${scene.title} — ${scene.location}`
  });
  stage.addEventListener('click', (event) => {
    if (event.target !== stage) return;
    showSearchRipple(stage, event);
    toast('Nothing unusual there. Keep looking.');
  });

  stage.append(el('div', { class: 'scene-title' },
    el('small', {}, chapter.title),
    el('strong', {}, scene.title)));

  // Characters remain part of the painted 2D composition and can be tapped
  // directly to replay the scene conversation.
  stage.append(sprite('leah', game, scene), sprite('moshe', game, scene));

  // Hotspots are concealed until the player taps them. The accessibility
  // reveal option makes them visibly pulse without changing progression.
  for (const spot of scene.hotspots) {
    if (spot.view && spot.view !== 'both' && spot.view !== save.view) continue;
    const done = isSpotDone(spot, save, state);
    const locked = spot.locked && !conditionMet(spot.locked, save);
    const btn = el('button', {
      type: 'button',
      class: `hotspot ${spot.type}${done ? ' done' : ''}${locked ? ' locked' : ''}${save.settings.hotspotHighlight ? ' hl' : ''}`,
      style: `left:${spot.x}%;top:${spot.y}%`,
      'aria-label': locked ? `${spot.label} (locked)` : spot.label,
      title: save.settings.hotspotHighlight ? spot.label : '',
      onclick: (event) => {
        event.stopPropagation();
        activate(spot, scene, game);
      }
    }, HOTSPOT_ICON[spot.type] || '?');
    stage.append(btn);
  }

  const complete = sceneComplete(scene, save);
  const needDone = scene.need.filter((id) => save.solvedPuzzles.includes(id) || state.found.includes(id)).length;
  const previous = (save.navigationHistory || []).at(-1) || findPreviousScene(scene.id, game.data.scenes.scenes);

  if (previous) {
    stage.append(el('button', {
      type: 'button', class: 'travel-arrow travel-back',
      'aria-label': 'Return to the previous location',
      onclick: (event) => { event.stopPropagation(); game.returnToScene(previous); }
    }, '‹'));
  }

  if (scene.next) {
    stage.append(el('button', {
      type: 'button', class: `travel-arrow travel-forward${complete ? ' ready' : ' locked'}`,
      'aria-label': complete ? 'Travel to the next location' : 'Complete the required investigation first',
      onclick: (event) => {
        event.stopPropagation();
        if (!complete) {
          toast(remainingDiscoveryText(scene.need.length - needDone));
          return;
        }
        game.advanceScene(scene);
      }
    }, '›'));
  } else {
    stage.append(el('button', {
      type: 'button', class: `travel-arrow travel-forward${complete ? ' ready' : ' locked'}`,
      'aria-label': complete ? 'Complete the journey' : 'Complete the required investigation first',
      onclick: (event) => {
        event.stopPropagation();
        if (complete) game.showEnding();
        else toast(remainingDiscoveryText(scene.need.length - needDone));
      }
    }, '›'));
  }

  const info = el('footer', { class: 'scene-info' },
    el('div', { class: 'scene-copy' },
      el('h3', {}, scene.title),
      el('p', {}, scene.copy)),
    el('div', { class: 'scene-controls row wrap' },
      el('button', { class: 'btn small', onclick: () => playDialogue(scene.dialogue, game.data.characters, {}) }, 'Talk'),
      el('button', {
        class: 'btn small', 'aria-label': `Switch perspective, currently ${save.view === 'leah' ? 'Leah' : 'Moshé'}`,
        onclick: () => {
          save.view = save.view === 'leah' ? 'moshe' : 'leah';
          game.persist();
          renderScene(game);
          toast(`${save.view === 'leah' ? 'Leah' : 'Moshé'}'s perspective`);
        }
      }, el('img', { src: 'assets/png/ui/icon-swap.png', alt: '', width: 16, height: 16 }), ` View: ${save.view === 'leah' ? 'Leah' : 'Moshé'}`),
      el('button', {
        class: `btn small${save.settings.hotspotHighlight ? ' active' : ''}`,
        'aria-pressed': String(!!save.settings.hotspotHighlight),
        onclick: () => {
          save.settings.hotspotHighlight = !save.settings.hotspotHighlight;
          game.persist();
          renderScene(game);
        }
      }, save.settings.hotspotHighlight ? 'Hide search marks' : 'Reveal search marks')),
    el('div', { class: 'scene-progress-line' },
      el('span', {}, `${needDone}/${scene.need.length} required discoveries`),
      el('div', { class: 'progress' }, el('i', { style: `width:${(needDone / scene.need.length) * 100}%` }))));

  root.append(el('section', { class: 'scene' }, stage, info));
  $('#objectiveText').textContent = scene.objective;

  if (!state.introSeen) {
    state.introSeen = true;
    game.persist();
    setTimeout(() => playDialogue(scene.dialogue, game.data.characters, {}), 300);
  }
}

function remainingDiscoveryText(count) {
  return `${count} required ${count === 1 ? 'discovery' : 'discoveries'} remain.`;
}

function findPreviousScene(sceneId, scenes) {
  return Object.entries(scenes).find(([, candidate]) => candidate.next === sceneId)?.[0] || null;
}

function showSearchRipple(stage, event) {
  const rect = stage.getBoundingClientRect();
  const ripple = el('span', {
    class: 'search-ripple',
    style: `left:${event.clientX - rect.left}px;top:${event.clientY - rect.top}px`
  });
  stage.append(ripple);
  setTimeout(() => ripple.remove(), 650);
}

function isSpotDone(spot, save, state) {
  if (spot.type === 'puzzle') return save.solvedPuzzles.includes(spot.id);
  if (spot.type === 'rabbit') return save.rabbitMarks.includes(spot.id);
  return state.found.includes(spot.id);
}

function activate(spot, scene, game) {
  const save = game.save;
  const state = save.sceneState[scene.id];
  if (spot.locked && !conditionMet(spot.locked, save)) {
    toast('Not yet — another discovery must happen first.');
    return;
  }
  if (spot.type === 'puzzle') { openPuzzle(spot.id, game); return; }
  if (spot.type === 'rabbit') {
    if (save.rabbitMarks.includes(spot.id)) { toast('Rabbit Mark already collected'); return; }
    save.rabbitMarks.push(spot.id);
    save.insightTokens = Number(save.insightTokens || 0) + 1;
    game.persist();
    toast(`Rabbit Mark found · +1 Insight Token (${save.insightTokens})`);
    renderScene(game);
    return;
  }

  // clue / observe / item
  if (!state.found.includes(spot.id)) state.found.push(spot.id);
  if (spot.type === 'clue' && spot.clue && !save.clueBoard.includes(spot.clue)) {
    save.clueBoard.push(spot.clue);
  }
  if (spot.type === 'item' && spot.item && !save.inventory.includes(spot.item)) {
    save.inventory.push(spot.item);
  }
  game.persist();
  const clue = spot.clue ? game.data.mystery.clues.find((c) => c.clueId === spot.clue) : null;
  openModal(el('div', { class: 'section discovery-card' },
    el('p', { class: 'eyebrow' }, spot.type === 'clue' ? 'Clue discovered' : 'Observation'),
    el('h2', {}, spot.label),
    el('p', {}, spot.text || clue?.visibleForm || ''),
    scene.anomaly && spot.type === 'clue' ? el('p', { class: 'anomaly-tag' }, `Anomaly (${scene.anomaly.category}): ${scene.anomaly.text}`) : null,
    el('button', { class: 'btn primary', onclick: () => { closeModal(); renderScene(game); } }, 'Noted')
  ), { label: spot.label });
}

function sprite(name, game, scene) {
  const info = game.data.characters[name];
  const wrap = el('button', {
    type: 'button', class: `character ${name}`,
    'aria-label': `Talk to ${info.name}`,
    onclick: (event) => {
      event.stopPropagation();
      playDialogue(scene.dialogue, game.data.characters, {});
    }
  },
    el('div', {
      class: 'sprite', role: 'img', 'aria-label': info.name,
      style: `background-image:url('${info.atlas}')`
    }));
  return wrap;
}
