// Point-and-click scene renderer: painted background, tappable direct-PNG
// characters, concealed hotspots, search ripples, perspective switching,
// Rabbit Marks (Insight Tokens), travel arrows and backtracking.
import { el, $, openModal, closeModal, toast } from './ui.js';
import { playDialogue } from './dialogue.js';
import { openPuzzle } from './puzzle.js';
import { conditionMet, sceneComplete } from './core.js';

const HOTSPOT_ICON = {
  puzzle: 'assets/png/ui/hotspots/question.png',
  clue: 'assets/png/ui/hotspots/clue.png',
  rabbit: 'assets/png/ui/hotspots/rabbit.png',
  item: 'assets/png/ui/hotspots/item.png',
  observe: 'assets/png/ui/hotspots/observe.png',
  anomaly: 'assets/png/ui/hotspots/anomaly.png'
};
const SCENE_ART_SIZE = { width: 1280, height: 720 };
const SCENE_ART_RATIO = SCENE_ART_SIZE.width / SCENE_ART_SIZE.height;
const scenePanPositions = new Map();
let currentHotspotStage = null;
let currentStageLayout = null;
let stageLayoutFrame = 0;
const hotspotResizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver((entries) => {
      for (const entry of entries) positionHotspots(entry.target);
    });
const stageFrameResizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === currentStageLayout?.frame)) {
        restoreStageLayout();
      }
    });

function positionHotspots(stage) {
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  if (!stageWidth || !stageHeight) return;

  // Match CSS `background-size: cover` with centered positioning so hotspot
  // coordinates remain attached to the 1280x720 source art after cropping.
  const scale = Math.max(
    stageWidth / SCENE_ART_SIZE.width,
    stageHeight / SCENE_ART_SIZE.height
  );
  const renderedWidth = SCENE_ART_SIZE.width * scale;
  const renderedHeight = SCENE_ART_SIZE.height * scale;
  const offsetX = (stageWidth - renderedWidth) / 2;
  const offsetY = (stageHeight - renderedHeight) / 2;

  for (const spot of stage.querySelectorAll('.hotspot[data-source-x][data-source-y]')) {
    const mappedX = offsetX + (Number(spot.dataset.sourceX) / 100) * renderedWidth;
    const mappedY = offsetY + (Number(spot.dataset.sourceY) / 100) * renderedHeight;
    const halfWidth = (spot.offsetWidth || 56) / 2;
    const halfHeight = (spot.offsetHeight || 56) / 2;

    // Keep cropped source targets tappable at the nearest safe stage edge.
    spot.style.left = `${Math.min(stageWidth - halfWidth, Math.max(halfWidth, mappedX))}px`;
    spot.style.top = `${Math.min(stageHeight - halfHeight, Math.max(halfHeight, mappedY))}px`;
  }
}

function panRatio(viewport) {
  const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  return maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0.5;
}

function rememberCurrentPan() {
  if (!currentStageLayout?.viewport?.isConnected) return;
  if (currentStageLayout.viewport.scrollWidth - currentStageLayout.viewport.clientWidth <= 1) return;
  scenePanPositions.set(
    currentStageLayout.sceneId,
    panRatio(currentStageLayout.viewport)
  );
}

function restoreStageLayout() {
  const layout = currentStageLayout;
  if (!layout?.frame?.isConnected) return;
  const { frame, viewport, stage, sceneId } = layout;
  const portrait = window.matchMedia?.('(orientation: portrait)').matches ?? false;
  const canvasWidth = portrait
    ? Math.max(viewport.clientWidth, viewport.clientHeight * SCENE_ART_RATIO)
    : viewport.clientWidth;
  stage.style.width = `${Math.ceil(canvasWidth)}px`;
  const ratio = scenePanPositions.get(sceneId) ?? 0.5;

  window.cancelAnimationFrame(stageLayoutFrame);
  stageLayoutFrame = window.requestAnimationFrame(() => {
    if (currentStageLayout !== layout) return;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = maxScroll * ratio;
    viewport.classList.toggle('is-pannable', maxScroll > 1);
    positionHotspots(stage);
  });
}

function observeStage(stage, frame, viewport, sceneId) {
  if (currentHotspotStage && hotspotResizeObserver) {
    hotspotResizeObserver.unobserve(currentHotspotStage);
  }
  if (currentStageLayout?.frame && stageFrameResizeObserver) {
    stageFrameResizeObserver.unobserve(currentStageLayout.frame);
  }
  currentHotspotStage = stage;
  currentStageLayout = { stage, frame, viewport, sceneId };
  if (!scenePanPositions.has(sceneId)) scenePanPositions.set(sceneId, 0.5);
  hotspotResizeObserver?.observe(stage);
  stageFrameResizeObserver?.observe(frame);
  restoreStageLayout();
}

window.addEventListener('resize', () => {
  if (!currentStageLayout?.frame?.isConnected) return;
  restoreStageLayout();
});
const SEARCH_LINES = [
  'Nothing here — but the light is lovely.',
  'Just scenery. Beautiful, uncooperative scenery.',
  'Moshé would caption this. Leah would measure it.',
  'No clue here. The rabbit remains unimpressed.',
  'Only paint and memory.'
];

export function renderScene(game) {
  rememberCurrentPan();
  const save = game.save;
  const scene = { ...game.data.scenes.scenes[save.sceneId], id: save.sceneId };
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
    class: 'stage', style: `background-image:url('${scene.background}')`
  });
  const viewport = el('div', {
    class: 'stage-viewport',
    role: 'region',
    tabindex: '0',
    'aria-label': `Scrollable view of ${scene.title}. Swipe or use the left and right arrow keys to explore.`
  }, stage);
  const frame = el('div', { class: 'stage-frame' }, viewport);
  frame.append(el('div', { class: 'scene-title' },
    el('small', {}, chapter.title),
    el('strong', {}, scene.title)));
  frame.append(el('div', { class: 'stage-pan-hint', 'aria-hidden': 'true' }, 'Swipe to explore ↔'));

  viewport.addEventListener('scroll', () => {
    if (currentStageLayout?.viewport !== viewport) return;
    if (viewport.scrollWidth - viewport.clientWidth <= 1) return;
    scenePanPositions.set(scene.id, panRatio(viewport));
  }, { passive: true });
  viewport.addEventListener('pointerdown', () => viewport.classList.add('has-panned'), { once: true });
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    viewport.classList.add('has-panned');
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const reducedMotion = document.body.classList.contains('reduced-motion')
      || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    viewport.scrollBy({
      left: direction * viewport.clientWidth * 0.65,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  });

  // Tap empty scenery → brief search ripple + short response.
  stage.addEventListener('click', (e) => {
    if (e.target !== stage) return;
    const rect = stage.getBoundingClientRect();
    const ripple = el('span', {
      class: 'search-ripple',
      style: `left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px`
    });
    stage.append(ripple);
    setTimeout(() => ripple.remove(), 700);
    toast(SEARCH_LINES[Math.floor(Math.random() * SEARCH_LINES.length)]);
  });

  // Tapping Leah or Moshé replays the local conversation.
  stage.append(sprite('leah', game, scene), sprite('moshe', game, scene));

  const reveal = !!save.settings.hotspotHighlight;
  for (const spot of scene.hotspots) {
    if (spot.view && spot.view !== 'both' && spot.view !== save.view) continue;
    const done = isSpotDone(spot, save, state);
    const locked = spot.locked && !conditionMet(spot.locked, save);
    const icon = locked
      ? 'assets/png/ui/hotspots/locked.png'
      : done
        ? 'assets/png/ui/hotspots/completed.png'
        : HOTSPOT_ICON[spot.type] || HOTSPOT_ICON.puzzle;
    const btn = el('button', {
      class: `hotspot ${spot.type}${done ? ' done' : ''}${locked ? ' locked' : ''}${reveal || done ? ' hl' : ' concealed'}`,
      style: `left:${spot.x}%;top:${spot.y}%;transform:translate(-50%,-50%)`,
      'data-source-x': spot.x,
      'data-source-y': spot.y,
      'aria-label': locked ? `${spot.label} (locked)` : spot.label,
      'data-label': spot.label,
      title: spot.label,
      onclick: (e) => { e.stopPropagation(); activate(spot, scene, game); }
    }, el('img', { src: icon, alt: '', width: 30, height: 30, decoding: 'async' }));
    stage.append(btn);
  }

  const complete = sceneComplete(scene, save);
  const needDone = scene.need.filter((id) => save.solvedPuzzles.includes(id) || state.found.includes(id)).length;

  // Travel arrows: back to any visited previous scene, forward when complete.
  const prevId = game.prevMap[scene.id];
  if (prevId && save.visitedScenes.includes(prevId)) {
    frame.append(el('button', {
      class: 'travel-arrow left', 'aria-label': `Travel back to ${game.data.scenes.scenes[prevId].title}`,
      onclick: (e) => { e.stopPropagation(); game.goToScene(prevId); }
    }, '‹'));
  }
  if (scene.next && complete) {
    frame.append(el('button', {
      class: 'travel-arrow right', 'aria-label': `Travel on to ${game.data.scenes.scenes[scene.next].title}`,
      onclick: (e) => { e.stopPropagation(); game.advanceScene(scene); }
    }, '›'));
  }

  const info = el('footer', { class: 'scene-info' },
    el('h3', {}, scene.title),
    el('p', {}, scene.copy),
    el('div', { class: 'row wrap' },
      el('button', { class: 'btn small', onclick: () => playDialogue(scene.dialogue, game.data.characters, {}) }, 'Talk'),
      el('button', {
        class: 'btn small', 'aria-label': `Switch perspective, currently ${save.view === 'leah' ? 'Leah' : 'Moshé'}`,
        onclick: () => { save.view = save.view === 'leah' ? 'moshe' : 'leah'; game.persist(); renderScene(game); toast(`${save.view === 'leah' ? 'Leah' : 'Moshé'}'s perspective`); }
      }, el('img', { src: 'assets/png/ui/icon-swap.png', alt: '', width: 16, height: 16 }), ` View: ${save.view === 'leah' ? 'Leah' : 'Moshé'}`),
      complete && scene.next ? el('button', {
        class: 'btn primary', onclick: () => game.advanceScene(scene)
      }, 'Continue the journey →') : null,
      complete && !scene.next ? el('button', { class: 'btn primary', onclick: () => game.showEnding() }, 'Watch the sunrise') : null),
    el('div', { class: 'progress' }, el('i', { style: `width:${(needDone / scene.need.length) * 100}%` })));

  root.append(el('section', { class: 'scene' }, frame, info));
  observeStage(stage, frame, viewport, scene.id);
  $('#objectiveText').textContent = scene.objective;

  if (!state.introSeen) {
    state.introSeen = true;
    game.persist();
    setTimeout(() => playDialogue(scene.dialogue, game.data.characters, {}), 300);
  }
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
    toast('Not yet — something else must happen first.');
    return;
  }
  if (spot.type === 'puzzle') { openPuzzle(spot.id, game); return; }
  if (spot.type === 'rabbit') {
    if (save.rabbitMarks.includes(spot.id)) { toast('Rabbit Mark already collected'); return; }
    save.rabbitMarks.push(spot.id);
    save.insightTokens += 1;
    game.persist();
    toast(`Rabbit Mark collected — +1 Insight Token (${save.insightTokens} ◈)`);
    renderScene(game);
    return;
  }
  if (!state.found.includes(spot.id)) state.found.push(spot.id);
  if (spot.type === 'clue' && spot.clue && !save.clueBoard.includes(spot.clue)) {
    save.clueBoard.push(spot.clue);
  }
  if (spot.type === 'item' && spot.item && !save.inventory.includes(spot.item)) {
    save.inventory.push(spot.item);
  }
  game.persist();
  const clue = spot.clue ? game.data.mystery.clues.find((c) => c.clueId === spot.clue) : null;
  openModal(el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, spot.type === 'clue' ? 'Clue discovered' : 'Observation'),
    el('h2', {}, spot.label),
    el('p', {}, spot.text || clue?.visibleForm || ''),
    scene.anomaly && spot.type === 'clue' ? el('p', { class: 'anomaly-tag' }, `Anomaly (${scene.anomaly.category}): ${scene.anomaly.text}`) : null,
    el('button', { class: 'btn primary', onclick: () => { closeModal(); renderScene(game); } }, 'Noted')
  ), { label: spot.label });
}

function sprite(name, game, scene) {
  const info = game.data.characters[name];
  const src = info.poses?.idle || info.portrait;
  return el('div', { class: `character ${name}` },
    el('button', {
      class: 'character-button',
      'aria-label': `Talk with ${info.name}`,
      onclick: (e) => { e.stopPropagation(); playDialogue(scene.dialogue, game.data.characters, {}); }
    }, el('img', {
      class: 'sprite',
      src,
      alt: info.name,
      draggable: 'false',
      decoding: 'async'
    })));
}
