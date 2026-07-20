// Shared story-puzzle flow: discovery, persisted drafts, three progressive
// hints, gentle feedback, character reactions and narrative notebook reveals.
import { el, openModal, closeModal, toast } from './ui.js';
import { checkAnswer, puzzleAward } from './core.js';

const SEAL_ART = {
  eye: 'assets/png/ui/seal-eye.png', gear: 'assets/png/ui/seal-gear.png',
  compass: 'assets/png/ui/seal-compass.png', key: 'assets/png/ui/seal-key.png',
  hands: 'assets/png/ui/seal-hands.png'
};
const SEAL_NAME = { eye: 'Eye Seal', gear: 'Gear Seal', compass: 'Compass Seal', key: 'Key Seal', hands: 'Two Hands Seal' };
const MAX_HINTS = 3;

function reactionLayer(game, mood, puzzleNumber) {
  const variant = (Number(puzzleNumber) % 3) + 1;
  const pose = mood === 'correct' ? 'happy' : mood === 'wrong' ? 'thinking' : 'idle';
  return el('div', {
    class: `puzzle-reaction ${mood} reaction-${variant}`,
    'aria-hidden': 'true'
  }, ...['leah', 'moshe'].map((name) => el('img', {
    src: game.data.characters[name]?.poses?.[pose] || game.data.characters[name]?.portrait,
    alt: '', decoding: 'async'
  })));
}

function puzzleArt(id, title, { result = false } = {}) {
  return el('img', {
    class: result ? 'puzzle-result-art' : 'puzzle-board-art',
    src: `assets/png/puzzles/${id}.png`,
    alt: `Illustrated clue board for ${title}`,
    width: 1024,
    height: 768,
    decoding: 'async'
  });
}

export function openPuzzle(id, game) {
  const save = game.save;
  if (save.solvedPuzzles.includes(id)) return showSolved(id, game, false);
  if (!save.encounteredPuzzles.includes(id)) {
    save.encounteredPuzzles.push(id);
    game.persist();
    return discoveryCard(id, game);
  }
  puzzleScreen(id, game);
}

function discoveryCard(id, game) {
  const p = game.data.puzzles[id];
  openModal(el('div', { class: 'solution discovery' },
    el('img', { src: SEAL_ART[p.seal], alt: '', width: 72, height: 72 }),
    el('p', { class: 'eyebrow' }, `Puzzle ${p.n} discovered`),
    el('h2', {}, p.title),
    puzzleArt(id, p.title, { result: true }),
    el('p', {}, `${p.cat} · up to ${p.points} Memory Points`),
    el('p', {}, p.prompt),
    el('div', { class: 'row' },
      el('button', { class: 'btn primary', onclick: () => { closeModal(); puzzleScreen(id, game); } }, 'Start puzzle'),
      el('button', {
        class: 'btn', onclick: () => { closeModal(); toast('Saved to the Notebook’s Puzzle Index'); game.render(); }
      }, 'Solve later'))
  ), { label: `Puzzle discovered: ${p.title}` });
}

function puzzleScreen(id, game) {
  const p = game.data.puzzles[id];
  const save = game.save;
  save.drafts[id] ??= {};
  const draft = save.drafts[id];
  let hintLevel = Math.min(save.hintsUsed[id] || 0, MAX_HINTS);
  let checking = false;

  const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const hintBox = el('div', { class: 'hint-box' });
  const body = el('div', { class: 'puzzle-body' });
  const pointsLine = el('p', { class: 'points-line' });
  const artTargetButtons = [];

  const renderHint = () => {
    hintBox.innerHTML = '';
    for (let i = 1; i <= hintLevel; i++) {
      hintBox.append(el('div', { class: 'hint' },
        el('strong', {}, `Indice ${i}/${MAX_HINTS}`), el('br'), p.hints[i - 1]));
    }
  };

  const getAnswer = () => {
    if (p.type === 'choice') return draft.value;
    if (p.type === 'sequence') return (draft.seq || []).map((i) => p.tokens[i]);
    return draft.value;
  };

  const refreshArtTargets = () => {
    for (const { button, tokenIndex } of artTargetButtons) {
      const order = (draft.seq || []).indexOf(tokenIndex);
      button.classList.toggle('selected', order >= 0);
      button.setAttribute('aria-pressed', String(order >= 0));
      button.textContent = order >= 0 ? String(order + 1) : '';
    }
  };

  const toggleSequenceIndex = (tokenIndex) => {
    draft.seq ??= [];
    const at = draft.seq.indexOf(tokenIndex);
    if (at >= 0) draft.seq.splice(at, 1); else draft.seq.push(tokenIndex);
    game.persist();
    renderBody();
    refreshArtTargets();
  };

  const renderBody = () => {
    body.innerHTML = '';
    if (p.type === 'choice') {
      const opts = el('div', { class: 'options', role: 'radiogroup', 'aria-label': p.title });
      for (const [value, label] of p.options) {
        const input = el('input', { type: 'radio', name: `choice-${id}`, value });
        if (draft.value === value) input.checked = true;
        input.addEventListener('change', () => { draft.value = value; game.persist(); });
        opts.append(el('label', { class: 'option' }, input, ' ', label));
      }
      body.append(opts);
    } else if (p.type === 'sequence') {
      draft.seq ??= [];
      const grid = el('div', { class: 'sequence', 'aria-label': 'Items to place in order' });
      p.tokens.forEach((token, i) => {
        const used = draft.seq.includes(i);
        grid.append(el('button', {
          class: `seq-token${used ? ' used' : ''}`, 'aria-pressed': String(used),
          onclick: () => toggleSequenceIndex(i)
        }, token));
      });
      body.append(grid, el('p', { class: 'seq-readout', 'aria-live': 'polite' },
        el('strong', {}, 'Selected: '), draft.seq.map((i) => p.tokens[i]).join(' → ') || 'none'));
    } else {
      const input = el('input', {
        class: 'answer', id: `answer-${id}`, autocomplete: 'off',
        'aria-label': 'Your answer', placeholder: 'Your answer', value: draft.value || ''
      });
      input.addEventListener('input', () => { draft.value = input.value; game.persist(); });
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });
      body.append(input);
    }
  };

  const misses = () => save.puzzleMisses[id] || 0;
  const potential = () => puzzleAward(p.points, misses());
  const refreshPoints = () => { pointsLine.textContent = `Worth ${potential()} Memory Points`; };

  const hintBtn = el('button', {
    class: 'btn hintbtn', onclick: () => {
      if (hintLevel >= MAX_HINTS) { toast('Tous les indices de cette énigme sont ouverts.'); return; }
      if (save.insightTokens <= 0) { toast('No Insight Tokens — find Rabbit Marks to earn more.'); return; }
      save.insightTokens -= 1;
      hintLevel += 1;
      save.hintsUsed[id] = hintLevel;
      game.persist();
      renderHint();
    }
  }, 'Indice');

  const submitBtn = el('button', { class: 'btn primary submit' }, 'Valider');
  const artCanvas = el('div', { class: 'puzzle-art-canvas' }, puzzleArt(id, p.title));
  const visual = el('figure', { class: 'puzzle-visual' },
    artCanvas,
    reactionLayer(game, 'wrong', p.n),
    reactionLayer(game, 'correct', p.n));
  for (const target of p.artTargets || []) {
    const button = el('button', {
      class: 'puzzle-art-target',
      type: 'button',
      style: `left:${target.x}%;top:${target.y}%`,
      'aria-label': `Select ${target.label}`,
      'aria-pressed': 'false',
      onclick: () => toggleSequenceIndex(target.tokenIndex)
    });
    artCanvas.append(button);
    artTargetButtons.push({ button, tokenIndex: target.tokenIndex });
  }
  const controls = el('div', { class: 'puzzle puzzle-controls' },
    el('div', { class: 'instructions' }, p.inst),
    body, hintBox, feedback);
  const shell = el('div', { class: 'puzzle-shell idle', 'data-puzzle': id },
    el('header', { class: 'puzzle-head' },
      el('img', { src: SEAL_ART[p.seal], alt: '', width: 52, height: 52 }),
      el('div', {},
        el('p', { class: 'eyebrow' }, `Puzzle ${p.n} · ${p.cat}${p.coop ? ' · Cooperative' : ''}${p.view && p.view !== 'both' ? ` · ${p.view === 'leah' ? 'Leah' : 'Moshé'}'s view` : ''}`),
        el('h2', {}, p.title), el('p', {}, p.prompt), pointsLine)),
    el('div', { class: 'puzzle-workspace' }, visual, controls),
    el('div', { class: 'puzzle-buttons puzzle-actions' },
      el('button', { class: 'btn reset', onclick: () => { save.drafts[id] = {}; game.persist(); closeModal(); puzzleScreen(id, game); } }, 'Reset'),
      hintBtn,
      el('button', { class: 'btn solve-later', onclick: () => { closeModal(); toast('Draft kept — reopen from the Puzzle Index.'); game.render(); } }, 'Solve later'),
      submitBtn));

  async function submit() {
    if (checking) return;
    checking = true;
    shell.classList.remove('wrong');
    shell.classList.add('checking');
    submitBtn.disabled = true;
    feedback.textContent = 'Vérification…';
    const ok = await checkAnswer(p, getAnswer(), game.data.mystery.finalValidationHash);
    game.audio?.playPuzzleCue(ok, save.settings.sound);
    if (ok) {
      if (!save.solvedPuzzles.includes(id)) {
        game.checkpointNow?.();
        save.solvedPuzzles.push(id);
        save.journeySeals[p.seal] = (save.journeySeals[p.seal] || 0) + 1;
        save.memoryPoints += potential();
        if (p.awardsClue && !save.clueBoard.includes(p.awardsClue)) save.clueBoard.push(p.awardsClue);
      }
      delete save.drafts[id];
      game.persist(); game.autosaveNow();
      shell.classList.remove('checking');
      shell.classList.add('correct');
      feedback.textContent = 'Félicitations !';
      window.setTimeout(() => showSolved(id, game, true), document.body.classList.contains('reduced-motion') ? 0 : 520);
      return;
    }

    save.puzzleMisses[id] = misses() + 1;
    game.persist();
    refreshPoints();
    shell.classList.remove('checking');
    shell.classList.add('wrong');
    feedback.textContent = misses() >= 2
      ? 'Dommage… réessayez. Un indice peut remettre le raisonnement sur la bonne piste.'
      : 'Dommage… réessayez.';
    if (misses() >= 3) hintBtn.classList.add('suggested');
    window.setTimeout(() => shell.classList.remove('wrong'), 520);
    submitBtn.disabled = false;
    checking = false;
  }

  submitBtn.addEventListener('click', submit);
  renderBody();
  refreshArtTargets();
  renderHint();
  refreshPoints();
  if (misses() >= 3) hintBtn.classList.add('suggested');
  openModal(shell, { label: p.title });
}

export function showSolved(id, game, newly) {
  const p = game.data.puzzles[id];
  const earned = newly ? puzzleAward(p.points, (game.save.puzzleMisses[id] || 0)) : null;
  const clue = p.awardsClue
    ? game.data.mystery.clues.find((item) => item.clueId === p.awardsClue)
    : null;
  openModal(el('div', { class: 'solution puzzle-reveal solved' },
    reactionLayer(game, 'correct', p.n),
    el('img', { src: SEAL_ART[p.seal], alt: '', width: 72, height: 72 }),
    el('p', { class: 'eyebrow' }, newly ? 'Félicitations !' : 'Énigme résolue'),
    el('h2', {}, p.title),
    puzzleArt(id, p.title, { result: true }),
    el('p', { class: 'seal' }, `◆ ${SEAL_NAME[p.seal]}${newly ? ` · +${earned} Memory Points` : ''}`),
    el('p', { class: 'reveal-text' }, p.why),
    el('aside', { class: 'notebook-update' },
      el('strong', {}, clue ? 'Carnet mis à jour' : 'Déduction ajoutée au carnet'),
      el('p', {}, clue?.visibleForm || p.why)),
    el('button', {
      class: 'btn primary', onclick: () => {
        closeModal();
        if (newly) toast(`${SEAL_NAME[p.seal]} added · +${earned} points`);
        game.onPuzzleClosed(id, newly);
      }
    }, 'Return to the journey')
  ), { label: 'Puzzle result' });
}
