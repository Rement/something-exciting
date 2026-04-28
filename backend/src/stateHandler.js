import { getEvent, saveEvent, deleteEvent, listEvents, setPinMapping, deletePinMapping } from './lib/db.js';
import { getUnlockedCardIndices } from './lib/schedule.js';
import { logger } from './lib/logger.js';

const TOTAL_CARDS = 26;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function normalizeCards(input) {
  const out = [];
  for (let i = 0; i < TOTAL_CARDS; i++) {
    const c = input?.[i] || {};
    out.push({
      icon: typeof c.icon === 'string' ? c.icon : '',
      text: typeof c.text === 'string' ? c.text : '',
      unlockAt: typeof c.unlockAt === 'string' ? c.unlockAt : '',
    });
  }
  return out;
}

function startISO(cards) {
  return cards[0]?.unlockAt || '';
}

function endISO(cards) {
  return cards[TOTAL_CARDS - 1]?.unlockAt || '';
}

export async function handler(event) {
  try {
    const role = event.requestContext?.authorizer?.role;
    const authEventId = event.requestContext?.authorizer?.eventId;

    // POST /config — admin creates/updates/deletes an event
    if (event.resource === '/config') {
      if (role !== 'admin') return json(403, { error: 'Admin access required' });
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'delete' && body.eventId) {
        const existing = await getEvent(body.eventId);
        if (existing && existing.pin) await deletePinMapping(existing.pin);
        await deleteEvent(body.eventId);
        logger.info('event deleted', { eventId: body.eventId });
        return json(200, { ok: true });
      }

      const eventId = body.eventId || generateId();

      const existing = body.eventId ? await getEvent(eventId) : null;
      if (existing && existing.pin && existing.pin !== (body.pin || '')) {
        await deletePinMapping(existing.pin);
      }

      await saveEvent(eventId, {
        pin: body.pin,
        recipientName: body.recipientName,
        cards: normalizeCards(body.cards),
      });

      if (body.pin) {
        await setPinMapping(body.pin, eventId);
      }

      logger.info('event saved', { eventId });
      return json(200, { ok: true, eventId });
    }

    // GET /events — admin lists all events
    if (event.resource === '/events') {
      if (role !== 'admin') return json(403, { error: 'Admin access required' });
      const events = await listEvents();
      const now = new Date();
      const enriched = events.map(ev => ({
        ...ev,
        unlockedCount: getUnlockedCardIndices(now, ev.cards).length,
        scratchedCount: ev.scratchedTiles.length,
        startDateISO: startISO(ev.cards),
        endDateISO: endISO(ev.cards),
      }));
      return json(200, { events: enriched });
    }

    // GET /state
    const eventId = authEventId || (role === 'admin' && event.queryStringParameters?.eventId);
    if (!eventId) return json(400, { error: 'No event context' });

    const ev = await getEvent(eventId);
    if (!ev) return json(404, { error: 'Event not found' });

    const now = new Date();
    const unlockedTiles = getUnlockedCardIndices(now, ev.cards);

    return json(200, {
      scratchedTiles: ev.scratchedTiles,
      unlockedTiles,
      cards: ev.cards,
      totalCards: TOTAL_CARDS,
      serverTimeISO: now.toISOString(),
      startDateISO: startISO(ev.cards),
      endDateISO: endISO(ev.cards),
      recipientName: ev.recipientName || '',
      lastScratchAt: ev.lastScratchAt || null,
    });
  } catch (err) {
    logger.error('state error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
