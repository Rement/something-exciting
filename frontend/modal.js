/* Bottom-sheet modal for card details. iPhone-friendly:
   - Slides up from the bottom
   - Dismiss by: backdrop tap, × button, swipe-down, or Escape key
*/

const SWIPE_DISMISS_PX = 120;

let root, backdrop, sheet, btnClose, numEl, iconEl, textEl;
let bound = false;
let dragging = false;
let dragStartY = 0;
let dragDelta = 0;
let activePointer = -1;

export function initModal() {
  if (bound) return;
  root      = document.getElementById('card-modal');
  backdrop  = document.getElementById('card-modal-backdrop');
  sheet     = document.getElementById('card-modal-sheet');
  btnClose  = document.getElementById('card-modal-close');
  numEl     = document.getElementById('card-modal-num');
  iconEl    = document.getElementById('card-modal-icon');
  textEl    = document.getElementById('card-modal-text');

  backdrop.addEventListener('click', close);
  btnClose.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) close();
  });

  // Swipe-down to dismiss (only initiated on the handle/header area)
  sheet.addEventListener('pointerdown', onDragStart);
  sheet.addEventListener('pointermove', onDragMove);
  sheet.addEventListener('pointerup', onDragEnd);
  sheet.addEventListener('pointercancel', onDragEnd);

  bound = true;
}

export function open({ index, total, icon, text }) {
  numEl.textContent = `${index + 1} / ${total}`;
  iconEl.textContent = icon || '🎂';
  textEl.textContent = text || '';
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  // Lock background scroll
  document.body.classList.add('modal-open');
  // Trigger CSS transition by toggling state class on next frame
  requestAnimationFrame(() => root.classList.add('card-modal--open'));
}

export function close() {
  if (root.hidden) return;
  root.classList.remove('card-modal--open');
  setTimeout(() => {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    sheet.style.transform = '';
  }, 280);
}

/* ---- swipe-down ---- */

function onDragStart(e) {
  // Only start drag if pointer is on the sheet itself (not on close btn)
  if (e.target.closest('.card-modal-close')) return;
  // Don't trap text-selection on the message body
  if (e.target.closest('.card-modal-text')) return;
  dragging = true;
  activePointer = e.pointerId;
  dragStartY = e.clientY;
  dragDelta = 0;
  sheet.style.transition = 'none';
  try { sheet.setPointerCapture(e.pointerId); } catch {}
}

function onDragMove(e) {
  if (!dragging || e.pointerId !== activePointer) return;
  dragDelta = Math.max(0, e.clientY - dragStartY);
  sheet.style.transform = `translateY(${dragDelta}px)`;
}

function onDragEnd(e) {
  if (!dragging || e.pointerId !== activePointer) return;
  dragging = false;
  sheet.style.transition = '';
  if (dragDelta >= SWIPE_DISMISS_PX) {
    close();
  } else {
    sheet.style.transform = '';
  }
  dragDelta = 0;
  activePointer = -1;
}
