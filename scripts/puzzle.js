// Puzzle modal: text / choice / sequence types, 4 progressive hints,
// reset, draft persistence, solution explanation, seals.
import { el, openModal, closeModal, toast } from './ui.js';
import { checkAnswer } from './core.js';

const SEAL_ART = {
  eye: 'assets/png/ui/seal-eye.png', gear: 'assets/png/ui/seal-gear.png',
  compass: 'assets/png/ui/seal-compass.png', key: 'assets/png/ui/seal-key.png',
  hands: 'assets/png/ui/seal-hands.png'
};
const SEAL_NAME = { eye: 'Eye Seal', gear: 'Gear Seal', compass: 'Compass Seal', key: 'Key Seal', hands: 'Two Hands Seal' };

export function openPuzzle(id, game) {
  const p = game.data.puzzles[id];
  const save = game.save;
  if (save.solvedPuzzles.includes(id)) return showSolved(id, game, false);
  save.drafts[id] ??= {};
  const draft = save.drafts[id];
  let hintLevel = save.hintsUsed[id] || 0;

  const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const hintBox = el('div', { class: 'hint-box' });
  const body = el('div', { class: 'puzzle-body' });

  const renderHint = () => {
    hintBox.innerHTML = '';
    if (hintLevel > 0) {
      hintBox.append(el('div', { class: 'hint' },
        el('strong', {}, `Hint ${hintLevel}/4`), el('br'), p.hints[hintLevel - 1]));
    }
  };

  const getAnswer = () => {
    if (p.type === 'choice') return draft.value;
    if (p.type === 'sequence') return (draft.seq || []).map((i) => p.tokens[i]);
    return draft.value;
  };

  const renderBody = () => {
    body.innerHTML = '';
    if (p.type === 'choice') {
      const opts = el('div', { class: 'options', role: 'radiogroup', 'aria-label': p.title });
      for (const [value, label] of p.options) {
        const input = el('input', { type: 'radio', name: 'choice', value });
        if (draft.value === value) input.checked = true;
        input.addEventListener('change', () => { draft.value = value; game.persist(); });
        opts.append(el('label', { class: 'option' }, input, ' ', label));
      }
      body.append(opts);
    } else if (p.type === 'sequence') {
      draft.seq ??= [];
      const grid = el('div', { class: 'sequence' });
      p.tokens.forEach((token, i) => {
        const used = draft.seq.includes(i);
        grid.append(el('button', {
          class: `seq-token${used ? ' used' : ''}`, 'aria-pressed': String(used),
          onclick: () => {
            const at = draft.seq.indexOf(i);
            if (at >= 0) draft.seq.splice(at, 1); else draft.seq.push(i);
            game.persist(); renderBody();
          }
        }, token));
      });
      body.append(grid, el('p', { class: 'seq-readout' },
        el('strong', {}, 'Selected: '), draft.seq.map((i) => p.tokens[i]).join(' → ') || 'none'));
    } else {
      const input = el('input', {
        class: 'answer', id: 'answerInput', autocomplete: 'off',
        'aria-label': 'Your answer', placeholder: 'Your answer', value: draft.value || ''
      });
      input.addEventListener('input', () => { draft.value = input.value; game.persist(); });
      body.append(input);
    }
  };
  renderBody();
  renderHint();

  const submit = async () => {
    const ok = await checkAnswer(p, getAnswer(), game.data.mystery.finalValidationHash);
    if (ok) {
      if (!save.solvedPuzzles.includes(id)) {
        save.solvedPuzzles.push(id);
        save.journeySeals[p.seal] = (save.journeySeals[p.seal] || 0) + 1;
        if (p.awardsClue && !save.clueBoard.includes(p.awardsClue)) save.clueBoard.push(p.awardsClue);
      }
      delete save.drafts[id];
      game.persist(); game.autosaveNow();
      showSolved(id, game, true);
    } else {
      feedback.textContent = 'That does not satisfy every clue yet.';
    }
  };

  openModal(el('div', {},
    el('header', { class: 'puzzle-head' },
      el('img', { src: SEAL_ART[p.seal], alt: '', width: 52, height: 52 }),
      el('div', {},
        el('p', { class: 'eyebrow' }, `Puzzle ${p.n} · ${p.cat}${p.coop ? ' · Cooperative' : ''}${p.view && p.view !== 'both' ? ` · ${p.view === 'leah' ? 'Leah' : 'Moshé'}'s view` : ''}`),
        el('h2', {}, p.title),
        el('p', {}, p.prompt))),
    el('div', { class: 'puzzle' },
      el('div', { class: 'instructions' }, p.inst),
      body, hintBox, feedback,
      el('div', { class: 'puzzle-buttons' },
        el('button', { class: 'btn', onclick: () => { save.drafts[id] = {}; game.persist(); closeModal(); openPuzzle(id, game); } }, 'Reset'),
        el('button', {
          class: 'btn', onclick: () => {
            hintLevel = Math.min(4, hintLevel + 1);
            save.hintsUsed[id] = hintLevel; game.persist(); renderHint();
          }
        }, 'Hint'),
        el('button', { class: 'btn primary', onclick: submit }, 'Submit')))
  ), { label: p.title });
}

export function showSolved(id, game, newly) {
  const p = game.data.puzzles[id];
  openModal(el('div', { class: 'solution' },
    el('img', { src: SEAL_ART[p.seal], alt: '', width: 72, height: 72 }),
    el('p', { class: 'eyebrow' }, newly ? 'Puzzle solved' : 'Solved puzzle'),
    el('h2', {}, p.title),
    el('p', { class: 'seal' }, `◆ ${SEAL_NAME[p.seal]}`),
    el('p', {}, p.why),
    el('button', {
      class: 'btn primary', onclick: () => {
        closeModal();
        if (newly) toast(`${SEAL_NAME[p.seal]} added to the Passport`);
        game.onPuzzleClosed(id, newly);
      }
    }, 'Return to the journey')
  ), { label: 'Puzzle result' });
}
