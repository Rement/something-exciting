import { resetEvent } from './lib/db.js';
import { logger } from './lib/logger.js';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  try {
    const role = event.requestContext?.authorizer?.role;
    if (role !== 'admin') {
      return json(403, { error: 'Admin access required' });
    }

    const { eventId } = JSON.parse(event.body || '{}');
    if (!eventId) return json(400, { error: 'eventId required' });

    await resetEvent(eventId);
    logger.info('event reset', { eventId });
    return json(200, { ok: true });
  } catch (err) {
    logger.error('reset error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
