import { api } from './api.js';
import { setSimTime, clearSimTime, now } from './time.js';

const TOTAL_CARDS = 26;

let refreshTimer;
let editingEventId = null;
let cards = []; // [{icon, text, unlockAt}] length TOTAL_CARDS

export function initAdmin() {
  loadEvents();
  refreshTimer = setInterval(updateClock, 1000);

  document.getElementById('admin-add-event').onclick = () => openForm({});
  document.getElementById('admin-form-save').onclick = saveForm;
  document.getElementById('admin-form-cancel').onclick = closeForm;

  document.getElementById('admin-cards-fill').onclick = distributeTimesEvenly;

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
    clearInterval(refreshTimer);
    document.getElementById('admin-sim-date').value = '';
    if (location.pathname === '/admin') {
      location.href = '/';
      return;
    }
    document.dispatchEvent(new CustomEvent('switch-to-user'));
  };
}

/* ---- Events list ---- */

async function loadEvents() {
  const list = document.getElementById('admin-events-list');
  list.innerHTML = '';
  try {
    const { events } = await api.events();
    if (events.length === 0) {
      list.innerHTML = '<p class="admin-empty">No events yet</p>';
    } else {
      events.forEach(ev => list.appendChild(createCard(ev)));
    }
  } catch {
    list.innerHTML = '<p class="admin-empty">Failed to load events</p>';
  }
}

function createCard(ev) {
  const card = document.createElement('div');
  card.className = 'admin-card';

  const scratched = ev.scratchedCount || 0;
  const unlocked = ev.unlockedCount || 0;
  const status = `${scratched}/${unlocked} opened · ${unlocked}/${TOTAL_CARDS} unlocked`;
  const dateRange = ev.startDateISO && ev.endDateISO
    ? `${shortDate(ev.startDateISO)} → ${shortDate(ev.endDateISO)}`
    : '—';

  card.innerHTML = `
    <div class="admin-card-main">
      <div class="admin-card-name">${esc(ev.recipientName) || 'Unnamed'}</div>
      <div class="admin-card-meta">
        <span class="admin-card-pin">PIN ${esc(ev.pin) || '---'}</span>
        <span class="admin-card-sep">·</span>
        <span>${status}</span>
        <span class="admin-card-sep">·</span>
        <span>${dateRange}</span>
      </div>
    </div>
    <div class="admin-card-actions">
      <button class="admin-row-btn" data-action="edit">Edit</button>
      <button class="admin-row-btn" data-action="clone">Clone</button>
      <button class="admin-row-btn" data-action="preview">View</button>
      <button class="admin-row-btn admin-row-btn--danger" data-action="reset">Reset</button>
      <button class="admin-row-btn admin-row-btn--danger" data-action="delete">Del</button>
    </div>
  `;

  card.querySelector('[data-action="edit"]').onclick = () => openForm(ev);
  card.querySelector('[data-action="clone"]').onclick = () => cloneEvent(ev);
  card.querySelector('[data-action="preview"]').onclick = () => previewEvent(ev.eventId);
  card.querySelector('[data-action="reset"]').onclick = (e) => resetEvent(ev.eventId, e.target);
  card.querySelector('[data-action="delete"]').onclick = (e) => deleteEvent(ev.eventId, e.target);

  return card;
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function esc(val) {
  if (!val) return '';
  return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Form ---- */

function openForm(ev) {
  editingEventId = ev.eventId || null;
  const form = document.getElementById('admin-form');
  const title = document.getElementById('admin-form-title');
  title.textContent = editingEventId ? 'Edit Event' : 'New Event';

  form.querySelectorAll('[data-field]').forEach(input => {
    input.value = ev[input.dataset.field] || '';
  });

  cards = (ev.cards && ev.cards.length === TOTAL_CARDS)
    ? ev.cards.map(c => ({ icon: c.icon || '', text: c.text || '', unlockAt: toLocalInput(c.unlockAt) }))
    : Array.from({ length: TOTAL_CARDS }, () => ({ icon: '', text: '', unlockAt: '' }));

  renderCards();

  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
  document.getElementById('admin-form').hidden = true;
  editingEventId = null;
}

async function saveForm() {
  const form = document.getElementById('admin-form');
  const btn = document.getElementById('admin-form-save');
  const data = {};

  form.querySelectorAll('[data-field]').forEach(input => {
    data[input.dataset.field] = input.value.trim();
  });

  data.cards = cards.map(c => ({
    icon: c.icon || '',
    text: c.text || '',
    unlockAt: c.unlockAt ? fromLocalInput(c.unlockAt) : '',
  }));
  if (editingEventId) data.eventId = editingEventId;

  btn.textContent = 'Saving\u2026';
  btn.disabled = true;
  try {
    const result = await api.saveConfig(data);
    editingEventId = result.eventId || editingEventId;
    btn.textContent = 'Saved';
    setTimeout(() => {
      btn.textContent = 'Save';
      btn.disabled = false;
      closeForm();
      loadEvents();
    }, 800);
  } catch {
    btn.textContent = 'Error';
    setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 2000);
  }
}

/* ---- Cards editor ---- */

function renderCards() {
  const container = document.getElementById('admin-cards-rows');
  container.innerHTML = '';
  cards.forEach((card, i) => {
    const role = i === 0 ? 'start' : i === TOTAL_CARDS - 1 ? 'end' : 'grid';
    const row = document.createElement('div');
    row.className = `admin-card-row admin-card-row--${role}`;
    row.innerHTML = `
      <div class="admin-card-row-head">
        <span class="admin-card-row-num">${i + 1}</span>
        <span class="admin-card-row-role">${role}</span>
        <input type="text" class="admin-field admin-card-icon" data-i="${i}" data-prop="icon"
               value="${esc(card.icon)}" placeholder="🎂" maxlength="4">
        <input type="datetime-local" class="admin-field admin-card-when" data-i="${i}" data-prop="unlockAt"
               value="${esc(card.unlockAt)}">
      </div>
      <textarea class="admin-field admin-card-text" data-i="${i}" data-prop="text"
                rows="2" placeholder="Card text shown in the modal">${esc(card.text)}</textarea>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('[data-prop]').forEach(input => {
    input.oninput = (e) => {
      const i = parseInt(e.target.dataset.i);
      const prop = e.target.dataset.prop;
      cards[i][prop] = e.target.value;
    };
  });
}

function distributeTimesEvenly() {
  const first = cards[0]?.unlockAt;
  const last = cards[TOTAL_CARDS - 1]?.unlockAt;
  if (!first || !last) {
    alert('Set the first and last card unlock times, then click again.');
    return;
  }
  const startMs = new Date(fromLocalInput(first)).getTime();
  const endMs = new Date(fromLocalInput(last)).getTime();
  if (!(endMs > startMs)) {
    alert('Last card time must be after the first.');
    return;
  }
  const step = (endMs - startMs) / (TOTAL_CARDS - 1);
  for (let i = 1; i < TOTAL_CARDS - 1; i++) {
    cards[i].unlockAt = toLocalInput(new Date(startMs + step * i).toISOString());
  }
  renderCards();
}

/* ---- datetime-local <-> ISO helpers ---- */

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local) {
  if (!local) return '';
  // Treat as local time, convert to ISO with timezone offset
  return new Date(local).toISOString();
}

/* ---- Actions ---- */

function cloneEvent(ev) {
  openForm({
    recipientName: ev.recipientName ? `${ev.recipientName} (copy)` : '',
    pin: '',
    cards: ev.cards || [],
  });
}

function previewEvent(eventId) {
  if (!eventId) return;
  localStorage.setItem('previewEventId', eventId);
  clearSimTime();
  clearInterval(refreshTimer);
  document.getElementById('admin-sim-date').value = '';
  if (location.pathname === '/admin') {
    location.href = '/';
    return;
  }
  document.dispatchEvent(new CustomEvent('switch-to-user'));
}

async function resetEvent(eventId, btn) {
  if (!eventId) return;
  btn.disabled = true;
  try {
    await api.reset(eventId);
    btn.textContent = 'Done';
    setTimeout(() => { btn.textContent = 'Reset'; btn.disabled = false; loadEvents(); }, 1000);
  } catch {
    btn.textContent = 'Err';
    setTimeout(() => { btn.textContent = 'Reset'; btn.disabled = false; }, 2000);
  }
}

async function deleteEvent(eventId, btn) {
  if (!eventId) return;
  btn.disabled = true;
  try {
    await api.saveConfig({ action: 'delete', eventId });
    loadEvents();
  } catch {
    btn.textContent = 'Err';
    setTimeout(() => { btn.textContent = 'Del'; btn.disabled = false; }, 2000);
  }
}

function updateClock() {
  document.getElementById('admin-current-time').textContent = now().toLocaleString();
}
