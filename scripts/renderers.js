// Visual puzzle renderers (Layton-style interactions), opt-in per puzzle via
// a `ui` field in data/puzzles.json. Each renderer is a pure input widget:
// it only writes the same answer string into draft.value that the player
// could have typed, so validators, saves, tests and hashes are unchanged.
// A puzzle without `ui` renders exactly as before.
import { el } from './ui.js';
import { sfx } from './audio.js';

function minutesToHHMM(total) {
  const t = ((total % 1440) + 1440) % 1440;
  const h = String(Math.floor(t / 60)).padStart(2, '0');
  const m = String(t % 60).padStart(2, '0');
  return `${h}:${m}`;
}
function hhmmToMinutes(s) {
  const [h, m] = String(s).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// --- Numeric keypad: contextual-math answers without a keyboard ------------
function keypad(p, draft, commit, game) {
  const display = el('div', { class: 'pv-display', 'aria-live': 'polite' }, draft.value || '·');
  const setVal = (v) => { draft.value = v; display.textContent = v || '·'; commit(); };
  const key = (label, onTap, wide) => el('button', {
    class: `pv-key${wide ? ' wide' : ''}`, type: 'button', 'aria-label': `Key ${label}`,
    onclick: () => { sfx('tap', game.save); onTap(); }
  }, label);
  const pad = el('div', { class: 'pv-keypad' });
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    pad.append(key(d, () => setVal((draft.value || '') + d)));
  }
  pad.append(
    key('⌫', () => setVal((draft.value || '').slice(0, -1))),
    key('0', () => setVal((draft.value || '') + '0')),
    key('C', () => setVal(''))
  );
  return el('div', { class: 'pv-widget' }, display, pad);
}

// --- Tap-to-set clocks: time-zone reasoning by turning hands ---------------
function clocks(p, draft, commit, game) {
  const cfg = p.uiConfig || {};
  const labels = cfg.clocks || [];
  const step = cfg.step || 30;
  draft.parts ??= labels.map(() => cfg.start || '09:00');
  const compose = () => { draft.value = draft.parts.join(','); commit(); };
  compose();
  const wrap = el('div', { class: 'pv-widget pv-clocks' });
  labels.forEach((name, i) => {
    const time = el('strong', { class: 'pv-clock-time', 'aria-live': 'polite' }, draft.parts[i]);
    const bump = (delta) => {
      draft.parts[i] = minutesToHHMM(hhmmToMinutes(draft.parts[i]) + delta);
      time.textContent = draft.parts[i];
      sfx('tap', game.save);
      compose();
    };
    wrap.append(el('div', { class: 'pv-clock' },
      el('span', {}, name),
      el('div', { class: 'pv-clock-row' },
        el('button', { class: 'pv-key', type: 'button', 'aria-label': `${name} minus ${step} minutes`, onclick: () => bump(-step) }, '−'),
        time,
        el('button', { class: 'pv-key', type: 'button', 'aria-label': `${name} plus ${step} minutes`, onclick: () => bump(step) }, '+'))));
  });
  wrap.append(el('p', { class: 'pv-note' }, cfg.note || ''));
  return wrap;
}

// --- Balance pan: place weights, watch the scale settle --------------------
function weights(p, draft, commit, game) {
  const cfg = p.uiConfig || {};
  const stock = cfg.weights || [];
  const target = cfg.target || 0;
  draft.picked ??= [];
  const compose = () => {
    draft.value = [...draft.picked].sort((a, b) => b - a).join(',');
    commit();
  };
  compose();
  const status = el('p', { class: 'pv-note', 'aria-live': 'polite' });
  const grid = el('div', { class: 'pv-keypad pv-weight-grid' });
  const refresh = () => {
    const sum = draft.picked.reduce((a, b) => a + b, 0);
    status.textContent = draft.picked.length
      ? `On the pan: ${draft.picked.join(' + ')} = ${sum} kg — the beam ${sum === target ? 'sits level.' : sum < target ? 'tips toward the suitcase.' : 'tips toward the weights.'}`
      : 'The pan is empty. The beam tips toward the suitcase.';
    grid.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('used', draft.picked.includes(Number(b.dataset.w)));
    });
  };
  for (const w of stock) {
    grid.append(el('button', {
      class: 'pv-key', type: 'button', 'data-w': w, 'aria-label': `${w} kilogram weight`,
      onclick: () => {
        const at = draft.picked.indexOf(w);
        if (at >= 0) draft.picked.splice(at, 1); else draft.picked.push(w);
        sfx('tap', game.save);
        compose(); refresh();
      }
    }, `${w} kg`));
  }
  refresh();
  return el('div', { class: 'pv-widget' }, grid, status);
}

// --- Turn-by-turn path: walk the lanes with two big buttons ----------------
function turns(p, draft, commit, game) {
  const cfg = p.uiConfig || {};
  const max = cfg.length || 6;
  draft.value ??= '';
  const trace = el('div', { class: 'pv-trace', 'aria-live': 'polite' });
  const refresh = () => {
    trace.innerHTML = '';
    const steps = (draft.value || '').split('');
    for (let i = 0; i < max; i++) {
      trace.append(el('span', { class: `pv-step${steps[i] ? ' set' : ''}` },
        steps[i] === 'L' ? '↰' : steps[i] === 'R' ? '↱' : '·'));
    }
  };
  const add = (c) => {
    if ((draft.value || '').length >= max) return;
    draft.value = (draft.value || '') + c;
    sfx('tap', game.save);
    commit(); refresh();
  };
  refresh();
  return el('div', { class: 'pv-widget' },
    trace,
    el('div', { class: 'pv-keypad pv-turn-row' },
      el('button', { class: 'pv-key wide', type: 'button', 'aria-label': 'Turn left', onclick: () => add('L') }, '↰ Left'),
      el('button', { class: 'pv-key wide', type: 'button', 'aria-label': 'Turn right', onclick: () => add('R') }, '↱ Right'),
      el('button', {
        class: 'pv-key', type: 'button', 'aria-label': 'Undo last turn',
        onclick: () => { draft.value = (draft.value || '').slice(0, -1); commit(); refresh(); }
      }, '⌫')));
}

// --- Letter tiles: spell the answer from a scrambled single-use bank -------
function letters(p, draft, commit, game) {
  const bank = (p.uiConfig?.bank || '').split('');
  draft.picks ??= [];
  const display = el('div', { class: 'pv-display', 'aria-live': 'polite' });
  const grid = el('div', { class: 'pv-keypad pv-letters' });
  const compose = () => {
    draft.value = draft.picks.map((i) => bank[i]).join('');
    display.textContent = draft.value || '·';
    grid.querySelectorAll('button[data-i]').forEach((b) => {
      b.classList.toggle('used', draft.picks.includes(Number(b.dataset.i)));
      b.disabled = draft.picks.includes(Number(b.dataset.i));
    });
    commit();
  };
  bank.forEach((ch, i) => {
    grid.append(el('button', {
      class: 'pv-key pv-tile', type: 'button', 'data-i': i, 'aria-label': `Letter ${ch}`,
      onclick: () => { draft.picks.push(i); sfx('tap', game.save); compose(); }
    }, ch));
  });
  grid.append(el('button', {
    class: 'pv-key', type: 'button', 'aria-label': 'Remove last letter',
    onclick: () => { draft.picks.pop(); compose(); }
  }, '⌫'));
  compose();
  return el('div', { class: 'pv-widget' }, display, grid);
}

// --- Arrange tiles: tap items in order; each shows its position ------------
function arrange(p, draft, commit, game) {
  const items = p.uiConfig?.items || [];
  const joiner = p.uiConfig?.joiner ?? '';
  draft.order ??= [];
  const grid = el('div', { class: 'pv-keypad pv-arrange' });
  const readout = el('p', { class: 'pv-note', 'aria-live': 'polite' });
  const compose = () => {
    draft.value = draft.order.map((i) => items[i][1]).join(joiner);
    readout.textContent = draft.order.length
      ? 'Order: ' + draft.order.map((i) => items[i][0]).join(' → ')
      : 'Tap the pieces in order. Tap again to take one back.';
    grid.querySelectorAll('button').forEach((b) => {
      const i = Number(b.dataset.i);
      const pos = draft.order.indexOf(i);
      b.classList.toggle('used', pos >= 0);
      b.querySelector('.seq-pos')?.remove();
      if (pos >= 0) b.append(el('span', { class: 'seq-pos', 'aria-hidden': 'true' }, String(pos + 1)));
    });
    commit();
  };
  items.forEach(([label], i) => {
    grid.append(el('button', {
      class: 'pv-key pv-tile', type: 'button', 'data-i': i, 'aria-label': label,
      onclick: () => {
        const at = draft.order.indexOf(i);
        if (at >= 0) draft.order.splice(at, 1); else draft.order.push(i);
        sfx('tap', game.save);
        compose();
      }
    }, label));
  });
  compose();
  return el('div', { class: 'pv-widget' }, grid, readout);
}

// --- Trip builder: load weights under a capacity, close each trip ----------
function trips(p, draft, commit, game) {
  const stock = p.uiConfig?.weights || [];
  const cap = p.uiConfig?.capacity || 0;
  draft.trips ??= [];
  draft.current ??= [];
  const usedWeights = () => [...draft.trips.flat(), ...draft.current];
  const status = el('p', { class: 'pv-note', 'aria-live': 'polite' });
  const grid = el('div', { class: 'pv-keypad pv-weight-grid' });
  const compose = () => {
    draft.value = draft.trips.map((t) => t.join('+')).join(',');
    const load = draft.current.reduce((a, b) => a + b, 0);
    const done = draft.trips.map((t) => `[${t.join('+')}]`).join(' ');
    status.textContent = `${done ? 'Trips: ' + done + ' · ' : ''}This trip: ${draft.current.join(' + ') || 'empty'}${load ? ` = ${load} kg` : ''} (limit ${cap} kg)`;
    grid.querySelectorAll('button[data-w]').forEach((b) => {
      const w = Number(b.dataset.w);
      b.classList.toggle('used', usedWeights().includes(w));
      b.disabled = draft.trips.flat().includes(w);
    });
    commit();
  };
  for (const w of stock) {
    grid.append(el('button', {
      class: 'pv-key pv-tile', type: 'button', 'data-w': w, 'aria-label': `${w} kilograms`,
      onclick: () => {
        const at = draft.current.indexOf(w);
        if (at >= 0) { draft.current.splice(at, 1); }
        else if (draft.current.reduce((a, b) => a + b, 0) + w > cap) { sfx('wrong', game.save); return; }
        else draft.current.push(w);
        sfx('tap', game.save);
        compose();
      }
    }, `${w}`));
  }
  const closeBtn = el('button', {
    class: 'pv-key wide', type: 'button', 'aria-label': 'Send this trip up',
    onclick: () => {
      if (!draft.current.length) return;
      draft.trips.push([...draft.current]);
      draft.current = [];
      sfx('travel', game.save);
      compose();
    }
  }, 'Send trip ▲');
  const undoBtn = el('button', {
    class: 'pv-key', type: 'button', 'aria-label': 'Bring last trip back',
    onclick: () => { if (draft.trips.length) draft.current = draft.trips.pop(); compose(); }
  }, '⌫');
  compose();
  return el('div', { class: 'pv-widget' }, grid, el('div', { class: 'pv-keypad pv-turn-row' }, closeBtn, undoBtn), status);
}

const RENDERERS = { keypad, clocks, weights, turns, letters, arrange, trips };

// Returns a widget element, or null when the puzzle has no visual renderer
// (callers then fall back to the classic input, exactly as before).
export function visualRenderer(p, draft, commit, game) {
  const make = RENDERERS[p.ui];
  return make ? make(p, draft, commit, game) : null;
}
