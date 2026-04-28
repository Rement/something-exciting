const HOLD_MS = 900;
const MOVE_TOLERANCE = 14; // px before hold cancels

let state = {
  total: 26,
  scratched: new Set(),
  unlocked: new Set(),
  cards: [],
  onScratched: null,
  onTap: null,
};

const tiles = []; // tiles[index] = button element

const LOCK_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/>
  <circle cx="12" cy="15" r="1.4" fill="currentColor"/>
</svg>`;

export function initCards(refs, cfg) {
  state.total = cfg.total || 26;
  state.scratched = new Set(cfg.scratchedTiles || []);
  state.unlocked = new Set(cfg.unlockedTiles || []);
  state.cards = cfg.cards || [];
  state.onScratched = cfg.onScratched || null;
  state.onTap = cfg.onTap || null;

  refs.startEl.innerHTML = '';
  refs.gridEl.innerHTML = '';
  refs.endEl.innerHTML = '';
  tiles.length = 0;

  // Tile 0 → start row
  refs.startEl.appendChild(buildTile(0));
  // Tiles 1..total-2 → grid
  for (let i = 1; i < state.total - 1; i++) {
    refs.gridEl.appendChild(buildTile(i));
  }
  // Last tile → end row
  refs.endEl.appendChild(buildTile(state.total - 1));

  for (let i = 0; i < state.total; i++) renderTile(i);
}

export function updateCards(cfg) {
  if (cfg.scratchedTiles) state.scratched = new Set(cfg.scratchedTiles);
  if (cfg.unlockedTiles) state.unlocked = new Set(cfg.unlockedTiles);
  if (cfg.cards) state.cards = cfg.cards;
  for (let i = 0; i < state.total; i++) renderTile(i);
}

export function getCard(index) {
  return state.cards[index] || { icon: '', text: '', unlockAt: '' };
}

/* ---- Build / render ---- */

function buildTile(index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tile';
  btn.dataset.i = String(index);
  btn.setAttribute('aria-label', `Card ${index + 1}`);
  btn.innerHTML = `
    <span class="tile-progress" aria-hidden="true"></span>
    <span class="tile-icon" data-role="icon"></span>
    <span class="tile-num">${index + 1}</span>
  `;
  attachHold(btn, index);
  tiles[index] = btn;
  return btn;
}

function renderTile(index) {
  const el = tiles[index];
  if (!el) return;
  const opened = state.scratched.has(index);
  const unlocked = state.unlocked.has(index);
  const card = getCard(index);

  el.classList.toggle('tile--opened', opened);
  el.classList.toggle('tile--ready', !opened && unlocked);
  el.classList.toggle('tile--locked', !opened && !unlocked);
  el.disabled = !opened && !unlocked;

  const icon = el.querySelector('[data-role="icon"]');
  if (opened) {
    icon.textContent = card.icon || '🎂';
    icon.classList.add('tile-icon--emoji');
  } else {
    icon.classList.remove('tile-icon--emoji');
    icon.innerHTML = LOCK_SVG;
  }
}

/* ---- Hold-to-open mechanic ---- */

function attachHold(el, index) {
  let startT = 0;
  let raf = 0;
  let startX = 0;
  let startY = 0;
  let pointerId = -1;

  const cancel = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    startT = 0;
    pointerId = -1;
    el.classList.remove('tile--holding');
    el.style.removeProperty('--p');
  };

  el.addEventListener('pointerdown', (e) => {
    // Tap on opened tile → modal (handled via click)
    if (state.scratched.has(index)) return;
    // Locked → no-op
    if (!state.unlocked.has(index)) return;

    e.preventDefault();
    pointerId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch {}
    startT = performance.now();
    startX = e.clientX;
    startY = e.clientY;
    el.classList.add('tile--holding');

    const tick = () => {
      const elapsed = performance.now() - startT;
      const p = Math.min(elapsed / HOLD_MS, 1);
      el.style.setProperty('--p', String(p));
      if (elapsed >= HOLD_MS) {
        el.classList.remove('tile--holding');
        el.style.removeProperty('--p');
        startT = 0;
        pointerId = -1;
        state.scratched.add(index);
        renderTile(index);
        if (state.onScratched) state.onScratched(index);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });

  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId || !startT) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy > MOVE_TOLERANCE * MOVE_TOLERANCE) cancel();
  });

  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('lostpointercapture', cancel);

  el.addEventListener('click', () => {
    if (state.scratched.has(index) && state.onTap) {
      state.onTap(index);
    }
  });
}
