import { api, setAuth, clearAuth, getToken, getRole } from './api.js';
import { initCountdown, stopCountdown, isCountdownDone } from './countdown.js';
import { initCards, updateCards, getCard } from './scratch.js';
import { initModal, open as openModal, close as closeModal } from './modal.js';
import { now } from './time.js';

const POLL_MS = 30000;
const TOTAL_CARDS = 26;

let endISO = null;
let endDate = null;
let countdownStarted = false;

/* ---- DOM ---- */
const $pin    = document.getElementById('screen-pin');
const $main   = document.getElementById('screen-main');
const $admin  = document.getElementById('screen-admin');
const pinIn   = document.getElementById('pin-input');
const pinErr  = document.getElementById('pin-error');
const heroTitle = document.getElementById('hero-title');
const heroWarm  = document.getElementById('hero-warm');
const countEl = document.getElementById('countdown');
const status  = document.getElementById('status-line');
const cardsStart = document.getElementById('cards-start');
const cardsGrid  = document.getElementById('cards-grid');
const cardsEnd   = document.getElementById('cards-end');
const progressEl = document.getElementById('cards-progress');
const offline = document.getElementById('offline-banner');
const scrollHint = document.getElementById('scroll-hint');

let pollId = null;
let cardsReady = false;
const isAdminRoute = location.pathname === '/admin';

/* ---- Screen routing ---- */

function show(screen) {
  $pin.classList.toggle('active', screen === 'pin');
  $main.classList.toggle('active', screen === 'main');
  $admin.classList.toggle('active', screen === 'admin');
}

scrollHint.addEventListener('click', () => {
  document.querySelector('.cards-section').scrollIntoView({ behavior: 'smooth' });
});

/* ---- PIN ---- */

pinIn.addEventListener('input', () => {
  pinErr.textContent = '';
  if (pinIn.value.length === 4) submitPin();
});

async function submitPin() {
  const pin = pinIn.value.trim();
  try {
    const { token, role } = await api.auth(pin);
    if (role === 'admin' && !isAdminRoute) {
      pinErr.textContent = 'Invalid PIN';
      pinIn.value = '';
      pinIn.focus();
      return;
    }
    if (isAdminRoute && role !== 'admin') {
      pinErr.textContent = 'Invalid PIN';
      pinIn.value = '';
      pinIn.focus();
      return;
    }
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
  initModal();

  const previewId = localStorage.getItem('previewEventId');
  localStorage.removeItem('previewEventId');

  let state;
  try {
    state = await api.state(previewId || undefined);
  } catch {
    state = JSON.parse(localStorage.getItem('lastState') || 'null');
    if (!state) { status.textContent = 'Offline'; return; }
  }

  if (state.recipientName) heroTitle.textContent = `For You, ${state.recipientName}`;

  endISO = state.endDateISO || null;
  endDate = endISO ? new Date(endISO) : null;

  if (!countdownStarted && endISO) {
    initCountdown(countEl, endISO);
    countdownStarted = true;
  }

  setupCards(state);
  applyState(state);

  pollId = setInterval(poll, POLL_MS);
}

function setupCards(state) {
  initCards(
    { startEl: cardsStart, gridEl: cardsGrid, endEl: cardsEnd },
    {
      total: state.totalCards || TOTAL_CARDS,
      scratchedTiles: state.scratchedTiles || [],
      unlockedTiles: state.unlockedTiles || [],
      cards: state.cards || [],
      onScratched: onTileScratched,
      onTap: onTileTap,
    },
  );
  cardsReady = true;
}

async function onTileScratched(tileIndex) {
  // Optimistic — show the modal immediately with cached card data
  const card = getCard(tileIndex);
  openModal({
    index: tileIndex,
    total: TOTAL_CARDS,
    icon: card.icon,
    text: card.text,
  });
  try {
    const s = await api.scratch(tileIndex);
    updateCards({
      scratchedTiles: s.scratchedTiles,
      unlockedTiles: s.unlockedTiles,
    });
    // Merge fresh server state into cached state without losing cards[]
    const cached = JSON.parse(localStorage.getItem('lastState') || '{}');
    localStorage.setItem('lastState', JSON.stringify({
      ...cached,
      scratchedTiles: s.scratchedTiles,
      unlockedTiles: s.unlockedTiles,
      serverTimeISO: s.serverTimeISO,
    }));
    applyState({ ...cached, ...s }, /* persist */ false);
  } catch { /* sync on next poll */ }
}

function onTileTap(tileIndex) {
  const card = getCard(tileIndex);
  openModal({
    index: tileIndex,
    total: TOTAL_CARDS,
    icon: card.icon,
    text: card.text,
  });
}

async function poll() {
  try {
    const s = await api.state();
    if (s.endDateISO && s.endDateISO !== endISO) {
      endISO = s.endDateISO;
      endDate = new Date(endISO);
    }
    if (cardsReady) {
      updateCards({
        scratchedTiles: s.scratchedTiles,
        unlockedTiles: s.unlockedTiles,
        cards: s.cards,
      });
    }
    applyState(s);
  } catch { /* offline */ }
}

function applyState(state, persist = true) {
  if (persist) localStorage.setItem('lastState', JSON.stringify(state));
  const scratched = state.scratchedTiles || [];
  const unlocked = state.unlockedTiles || [];
  const total = state.totalCards || TOTAL_CARDS;

  const ready = unlocked.filter(i => !scratched.includes(i)).length;
  const opened = scratched.length;
  const t = now();
  const finished = scratched.includes(total - 1);
  const countdownDone = endDate && t >= endDate;

  if (finished) {
    status.textContent = 'It\u2019s time. With all my love.';
    heroWarm.textContent = '';
  } else if (countdownDone) {
    status.textContent = 'The last card is waiting for you';
    heroWarm.textContent = '';
  } else if (ready > 0) {
    status.textContent = ready === 1
      ? '1 new card is ready'
      : `${ready} new cards are ready`;
    heroWarm.textContent = 'Hold a card to open it.';
  } else if (opened > 0) {
    status.textContent = 'Come back soon\u2026';
    heroWarm.textContent = 'A new card will arrive.';
  } else {
    status.textContent = 'Almost time.';
    heroWarm.textContent = '';
  }

  progressEl.textContent = `${opened} / ${total}`;

  if (countdownDone && !finished) {
    // Stop the timer once it hits zero — countdown.js handles itself but
    // ensure the element is empty so the hero stays clean.
    stopCountdown();
    countEl.textContent = '';
  }

  // Suppress lint: isCountdownDone unused but kept for future use
  void isCountdownDone;
}

/* ---- Admin → user view ---- */

document.addEventListener('switch-to-user', () => {
  show('main');
  if (pollId) clearInterval(pollId);
  cardsReady = false;
  countdownStarted = false;
  closeModal();
  startApp();
});

/* ---- Offline indicator ---- */

window.addEventListener('offline', () => offline.classList.add('visible'));
window.addEventListener('online', () => offline.classList.remove('visible'));

/* ---- Outdoor (bright-daylight) mode ---- */

const outdoorBtn = document.getElementById('outdoor-toggle');
const root = document.documentElement;
const syncOutdoorBtn = () => {
  const on = root.classList.contains('outdoor');
  outdoorBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  outdoorBtn.setAttribute(
    'aria-label',
    on ? 'Switch to night mode' : 'Switch to bright daylight mode',
  );
};
syncOutdoorBtn();
outdoorBtn.addEventListener('click', () => {
  const on = root.classList.toggle('outdoor');
  localStorage.setItem('outdoorMode', on ? '1' : '0');
  syncOutdoorBtn();
});

/* ---- Boot ---- */

(async function boot() {
  if (isAdminRoute) {
    if (getToken() && getRole() === 'admin') {
      try {
        await api.state();
        enter('admin');
        return;
      } catch { /* expired */ }
    }
    clearAuth();
    show('pin');
    pinIn.focus();
    return;
  }

  if (!getToken()) {
    show('pin');
    pinIn.focus();
    return;
  }

  try {
    await api.state();
    const role = getRole();
    if (role === 'admin') {
      clearAuth();
      show('pin');
      pinIn.focus();
      return;
    }
    enter(role);
  } catch {
    clearAuth();
    show('pin');
    pinIn.focus();
  }
})();
