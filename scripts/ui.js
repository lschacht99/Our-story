// Small shared UI helpers: modal, toast, element builder.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

export function openModal(content, { label = 'Dialog' } = {}) {
  const modal = $('#modal');
  const box = $('#modalContent');
  box.innerHTML = '';
  box.append(content.nodeType ? content : el('div', { html: content }));
  modal.setAttribute('aria-label', label);
  if (!modal.open) modal.showModal();
}

export function closeModal() {
  const modal = $('#modal');
  if (modal.open) modal.close();
  $('#modalContent').innerHTML = '';
}

let toastTimer = null;
export function toast(text) {
  const node = $('#toast');
  node.textContent = text;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}

export function formatTime(totalSeconds, clock24 = true) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function confirmDialog(message, onYes, { danger = false, requireDouble = false } = {}) {
  let confirmed = 0;
  const msg = el('p', {}, message);
  const yes = el('button', {
    class: danger ? 'btn danger' : 'btn primary',
    onclick: () => {
      confirmed += 1;
      if (requireDouble && confirmed === 1) {
        yes.textContent = 'Tap again to confirm';
        return;
      }
      closeModal();
      onYes();
    }
  }, requireDouble ? 'Confirm' : 'Yes');
  const no = el('button', { class: 'btn', onclick: closeModal }, 'Cancel');
  openModal(el('div', { class: 'section' }, msg, el('div', { class: 'row' }, yes, no)), { label: 'Confirm' });
}
