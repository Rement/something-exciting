import { api } from './api.js';
import { setSimTime, clearSimTime, now } from './time.js';

let unlockOverride = null; // null = no override, number = forced count
let refreshTimer;

export function initAdmin() {
  refresh();
  refreshTimer = setInterval(updateClock, 1000);

  document.getElementById('admin-force-reveal').onclick = async () => {
    await api.reveal();
    refresh();
  };

  document.getElementById('admin-reset').onclick = async () => {
    await api.reset();
    refresh();
  };

  document.getElementById('admin-unlock-all').onclick = () => {
    unlockOverride = 24;
    document.getElementById('admin-unlocked').textContent = '24 (override)';
  };

  document.getElementById('admin-lock-all').onclick = () => {
    unlockOverride = 0;
    document.getElementById('admin-unlocked').textContent = '0 (override)';
  };

  document.getElementById('admin-sim-date').onchange = (e) => {
    if (e.target.value) {
      setSimTime(e.target.value);
    } else {
      clearSimTime();
    }
    updateClock();
  };

  document.getElementById('admin-back').onclick = () => {
    clearSimTime();
    unlockOverride = null;
    clearInterval(refreshTimer);
    document.getElementById('admin-sim-date').value = '';
    document.dispatchEvent(new CustomEvent('switch-to-user'));
  };
}

export function getUnlockOverride() {
  return unlockOverride;
}

async function refresh() {
  try {
    const s = await api.state();
    document.getElementById('admin-scratched').textContent = `${s.scratchedTiles.length} / 24`;
    document.getElementById('admin-unlocked').textContent =
      unlockOverride != null ? `${unlockOverride} (override)` : String(s.unlockedTileCount);
    document.getElementById('admin-revealed').textContent = String(s.revealed);
    document.getElementById('admin-last-scratch').textContent = s.lastScratchAt || '—';
  } catch { /* offline */ }
  updateClock();
}

function updateClock() {
  document.getElementById('admin-current-time').textContent = now().toLocaleString();
}
