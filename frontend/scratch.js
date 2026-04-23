const THRESHOLD = 0.70;

let canvas, ctx;
let cols, rows, tileW, tileH;
let scratched = new Set();
let unlocked = 0;
let scratching = false;
let activeTile = -1;
let onScratched = null;

export function initScratch(canvasEl, { gridCols, gridRows, scratchedTiles, unlockedCount, onTileScratched }) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  cols = gridCols;
  rows = gridRows;
  scratched = new Set(scratchedTiles);
  unlocked = unlockedCount;
  onScratched = onTileScratched;

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);
  canvas.addEventListener('touchstart', onTouch(onStart), { passive: false });
  canvas.addEventListener('touchmove', onTouch(onMove), { passive: false });
  canvas.addEventListener('touchend', onEnd);
}

export function resizeScratch(w, h) {
  canvas.width = w;
  canvas.height = h;
  tileW = w / cols;
  tileH = h / rows;
  redraw();
}

export function updateScratchState(scratchedTiles, unlockedCount) {
  const newSet = new Set(scratchedTiles);
  const changed = newSet.size !== scratched.size || unlockedCount !== unlocked;
  scratched = newSet;
  unlocked = unlockedCount;
  if (changed && !scratching) redraw();
}

/* ---- Drawing ---- */

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < cols * rows; i++) {
    if (scratched.has(i)) continue;
    const x = (i % cols) * tileW;
    const y = Math.floor(i / cols) * tileH;

    ctx.fillStyle = i < unlocked ? '#111' : '#0a0a0a';
    ctx.fillRect(x, y, tileW, tileH);

    // tile border
    ctx.strokeStyle = i < unlocked ? '#222' : '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, tileH - 1);
  }
}

/* ---- Interaction ---- */

function pos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function tileAt(x, y) {
  const c = Math.floor(x / tileW);
  const r = Math.floor(y / tileH);
  if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
  return r * cols + c;
}

function erase(x, y) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, Math.min(tileW, tileH) * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function checkComplete(tile) {
  const x = Math.round((tile % cols) * tileW);
  const y = Math.round(Math.floor(tile / cols) * tileH);
  const w = Math.round(tileW);
  const h = Math.round(tileH);
  const data = ctx.getImageData(x, y, w, h).data;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) clear++;
  }
  return clear / (w * h) >= THRESHOLD;
}

function clearTile(tile) {
  const x = (tile % cols) * tileW;
  const y = Math.floor(tile / cols) * tileH;
  ctx.clearRect(x, y, tileW, tileH);
}

function onStart(e) {
  const p = pos(e);
  const t = tileAt(p.x, p.y);
  if (t < 0 || t >= unlocked || scratched.has(t)) return;
  scratching = true;
  activeTile = t;
  erase(p.x, p.y);
}

function onMove(e) {
  if (!scratching) return;
  const p = pos(e);
  if (tileAt(p.x, p.y) !== activeTile) return;
  erase(p.x, p.y);
}

function onEnd() {
  if (!scratching) return;
  scratching = false;
  if (activeTile >= 0 && checkComplete(activeTile)) {
    clearTile(activeTile);
    scratched.add(activeTile);
    if (onScratched) onScratched(activeTile);
  }
  activeTile = -1;
}

function onTouch(handler) {
  return (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handler({ clientX: t.clientX, clientY: t.clientY });
  };
}
