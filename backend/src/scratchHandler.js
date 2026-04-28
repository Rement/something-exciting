import { getEvent, scratchTile } from './lib/db.js';
import { getUnlockedCardIndices } from './lib/schedule.js';
import { logger } from './lib/logger.js';

const TOTAL_CARDS = 26;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  try {
    const eventId = event.requestContext?.authorizer?.eventId;
    if (!eventId) return json(400, { error: 'No event context' });

    const { tileIndex } = JSON.parse(event.body || '{}');
    if (tileIndex == null || tileIndex < 0 || tileIndex >= TOTAL_CARDS) {
      return json(400, { error: 'Invalid tile index' });
    }

    const ev = await getEvent(eventId);
    if (!ev) return json(404, { error: 'Event not found' });

    const now = new Date();
    const unlocked = new Set(getUnlockedCardIndices(now, ev.cards));

    if (!unlocked.has(tileIndex)) {
      return json(403, { error: 'Card not yet unlocked' });
    }

    const state = await scratchTile(eventId, tileIndex);
    logger.info('card opened', { eventId, tileIndex });

    return json(200, {
      scratchedTiles: state.scratchedTiles,
      unlockedTiles: [...unlocked].sort((a, b) => a - b),
      serverTimeISO: now.toISOString(),
    });
  } catch (err) {
    logger.error('scratch error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
