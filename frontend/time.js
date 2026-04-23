let simOffset = parseInt(localStorage.getItem('simTimeOffset') || '0') || 0;

export function now() {
  return new Date(Date.now() + simOffset);
}

export function setSimTime(isoString) {
  if (!isoString) {
    simOffset = 0;
    localStorage.removeItem('simTimeOffset');
    return;
  }
  simOffset = new Date(isoString).getTime() - Date.now();
  localStorage.setItem('simTimeOffset', String(simOffset));
}

export function clearSimTime() {
  setSimTime(null);
}
