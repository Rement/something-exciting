import { now } from './time.js';

let el;
let intervalId;
let revealDate;

export function initCountdown(element, revealDateISO) {
  el = element;
  revealDate = new Date(revealDateISO);
  tick();
  intervalId = setInterval(tick, 1000);
}

export function stopCountdown() {
  clearInterval(intervalId);
}

function tick() {
  const diff = revealDate - now();

  if (diff <= 0) {
    el.textContent = '';
    return;
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  el.innerHTML =
    `<span>${d}</span><span class="cd-label">d</span>` +
    `<span>${h}</span><span class="cd-label">h</span>` +
    `<span>${m}</span><span class="cd-label">m</span>` +
    `<span>${s}</span><span class="cd-label">s</span>`;
}
