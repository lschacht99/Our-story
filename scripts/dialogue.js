// Dialogue playback with direct PNG portraits, simple pose changes and history.
import { el, $ } from './ui.js';

const history = [];

export function getHistory() { return history; }

function poseForLine(text) {
  if (/(missing|erase|disappear|strange|wrong|rabbit)/i.test(text)) return 'scared';
  if (text.includes('?')) return 'thinking';
  if (text.includes('!')) return 'happy';
  return 'talking';
}

function setPose(who, pose, characters) {
  const sprite = document.querySelector(`.character.${who} .sprite`);
  const src = characters[who]?.poses?.[pose] || characters[who]?.poses?.idle;
  if (sprite && src) sprite.src = src;
}

function resetPoses(characters, endingPose = 'idle') {
  setPose('leah', endingPose, characters);
  setPose('moshe', endingPose, characters);
}

export function playDialogue(lines, characters, { onDone } = {}) {
  const stage = $('.stage');
  if (!stage || !lines?.length) { onDone?.(); return; }
  stage.querySelector('.dialogue')?.remove();
  let i = 0;

  const render = () => {
    stage.querySelector('.dialogue')?.remove();
    if (i >= lines.length) {
      resetPoses(characters, 'relief');
      window.setTimeout(() => resetPoses(characters, 'idle'), 650);
      onDone?.();
      return;
    }
    const [who, text] = lines[i];
    const info = characters[who] || { name: who };
    resetPoses(characters);
    setPose(who, poseForLine(text), characters);
    history.push({ who: info.name, text });
    if (history.length > 200) history.shift();
    const box = el('div', { class: 'dialogue', role: 'group', 'aria-label': `${info.name} speaking` },
      info.portrait ? el('img', { class: 'portrait', src: info.portrait, alt: '', width: 56, height: 56 }) : null,
      el('div', { class: 'dialogue-body' },
        el('strong', {}, info.name),
        el('p', {}, text)),
      el('button', { class: 'dialogue-next', 'aria-label': 'Next line', onclick: () => { i += 1; render(); } }, '›')
    );
    stage.append(box);
  };
  render();
}

export function historyPanel() {
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'eyebrow' }, 'Conversation log'),
    el('h2', {}, 'Dialogue history'));
  const list = el('div', { class: 'cards history' });
  for (const entry of history.slice(-40)) {
    list.append(el('div', { class: 'card' }, el('strong', {}, entry.who + ': '), entry.text));
  }
  if (!history.length) list.append(el('p', {}, 'No conversations yet.'));
  wrap.append(list);
  return wrap;
}
