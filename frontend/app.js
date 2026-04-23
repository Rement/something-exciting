import { api, setAuth, clearAuth, getToken, getRole } from './api.js';
import { initCountdown, stopCountdown, isCountdownDone } from './countdown.js';
import { initScratch, resizeScratch, updateScratchState } from './scratch.js';
import { now } from './time.js';

/* ---- Config (non-sensitive, from SPEC) ---- */
const REVEAL_ISO = '2026-05-15T13:00:00-07:00';
const START_ISO  = '2026-05-11T21:00:00-07:00';
const GRID_COLS  = 6;
const GRID_ROWS  = 4;
const PERSONAL_MSG = ''; // filled in before deploy
const POLL_MS    = 30000;

const REVEAL_DATE = new Date(REVEAL_ISO);
const REVEAL_DAY_START = new Date('2026-05-15T00:00:00-07:00');

/* ---- DOM ---- */
const $pin    = document.getElementById('screen-pin');
const $main   = document.getElementById('screen-main');
const $admin  = document.getElementById('screen-admin');
const pinIn   = document.getElementById('pin-input');
const pinErr  = document.getElementById('pin-error');
const countEl = document.getElementById('countdown');
const status  = document.getElementById('status-line');
const grid    = document.getElementById('grid-container');
const img     = document.getElementById('reveal-image');
const canvas  = document.getElementById('scratch-canvas');
const revBtn  = document.getElementById('reveal-btn');
const msgEl   = document.getElementById('personal-message');
const offline = document.getElementById('offline-banner');

let pollId = null;
let scratchReady = false;

/* ---- Screen routing ---- */

function show(screen) {
  $pin.classList.toggle('active', screen === 'pin');
  $main.classList.toggle('active', screen === 'main');
  $admin.classList.toggle('active', screen === 'admin');
}

/* ---- PIN ---- */

pinIn.addEventListener('input', () => {
  pinErr.textContent = '';
  if (pinIn.value.length === 4) submitPin();
});

async function submitPin() {
  const pin = pinIn.value.trim();
  try {
    const { token, role } = await api.auth(pin);
    setAuth(token, role);
    enter(role);
  } catch {
    pinErr.textContent = 'Invalid PIN';
    pinIn.value = '';
    pinIn.focus();
  }
}

function enter(role) {
  if (role === 'admin') {
    show('admin');
    import('./admin.js').then(m => m.initAdmin());
  } else {
    show('main');
    startApp();
  }
}

/* ---- Main app ---- */

async function startApp() {
  initCountdown(countEl, REVEAL_ISO, enableRevealBtn);

  let state;
  try {
    state = await api.state();
  } catch {
    state = JSON.parse(localStorage.getItem('lastState') || 'null');
    if (!state) { status.textContent = 'Offline'; return; }
  }

  applyState(state);
  setupScratch(state);
  pollId = setInterval(poll, POLL_MS);
}

function setupScratch(state) {
  const doSetup = () => {
    const w = grid.clientWidth;
    const h = grid.clientHeight;
    if (!scratchReady) {
      initScratch(canvas, {
        gridCols: GRID_COLS,
        gridRows: GRID_ROWS,
        scratchedTiles: state.scratchedTiles,
        unlockedCount: state.unlockedTileCount,
        onTileScratched: onTileScratched,
      });
      scratchReady = true;
    }
    resizeScratch(w, h);
  };

  if (img.naturalHeight) {
    grid.classList.add('has-image');
    doSetup();
  } else {
    img.addEventListener('load', () => {
      grid.classList.add('has-image');
      doSetup();
    }, { once: true });
    img.addEventListener('error', () => doSetup(), { once: true });
    // setup anyway after timeout in case image is slow
    setTimeout(() => { if (!scratchReady) doSetup(); }, 3000);
  }

  window.addEventListener('resize', () => {
    if (scratchReady) resizeScratch(grid.clientWidth, grid.clientHeight);
  });
}

async function onTileScratched(tileIndex) {
  try {
    const s = await api.scratch(tileIndex);
    applyState(s);
  } catch { /* sync on next poll */ }
}

async function poll() {
  try {
    const s = await api.state();
    applyState(s);
    updateScratchState(s.scratchedTiles, s.unlockedTileCount);
  } catch { /* offline — keep last state */ }
}

function applyState(state) {
  localStorage.setItem('lastState', JSON.stringify(state));
  const { scratchedTiles, revealed, unlockedTileCount } = state;

  // Status line
  const available = unlockedTileCount - scratchedTiles.length;
  const t = now();
  const isRevealTime = revealed || t >= REVEAL_DATE;
  const isRevealDay = t >= REVEAL_DAY_START;

  if (isRevealTime) {
    status.textContent = "It\u2019s time.";
  } else if (isRevealDay) {
    status.textContent = 'Something beautiful is almost here';
  } else if (available > 1) {
    status.textContent = `${available} tiles waiting for you`;
  } else if (available === 1) {
    status.textContent = 'A new tile has arrived';
  } else {
    status.textContent = 'Come back soon\u2026';
  }

  // Reveal button — show when it's reveal time, but disabled until countdown hits zero
  if (isRevealTime && revBtn.hidden) {
    revBtn.hidden = false;
    revBtn.disabled = !isCountdownDone();
  }
}

function enableRevealBtn() {
  revBtn.disabled = false;
}

revBtn.addEventListener('click', () => {
  img.classList.add('unblurred');
  canvas.classList.add('hidden');
  revBtn.hidden = true;
  stopCountdown();
  if (PERSONAL_MSG) {
    msgEl.textContent = PERSONAL_MSG;
    msgEl.hidden = false;
    requestAnimationFrame(() => msgEl.classList.add('visible'));
  }
});

/* ---- Admin → user view ---- */

document.addEventListener('switch-to-user', () => {
  show('main');
  if (pollId) clearInterval(pollId);
  scratchReady = false;
  startApp();
});

/* ---- Offline indicator ---- */

window.addEventListener('offline', () => offline.classList.add('visible'));
window.addEventListener('online', () => offline.classList.remove('visible'));

/* ---- Boot ---- */

(async function boot() {
  if (!getToken()) {
    show('pin');
    pinIn.focus();
    return;
  }

  try {
    await api.state(); // validate token
    enter(getRole());
  } catch {
    clearAuth();
    show('pin');
    pinIn.focus();
  }
})();
