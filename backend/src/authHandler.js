import { authenticate, signToken } from './lib/auth.js';
import { getEventByPin } from './lib/db.js';
import { logger } from './lib/logger.js';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  try {
    const { pin } = JSON.parse(event.body || '{}');
    if (!pin) return json(400, { error: 'PIN required' });

    // Check DynamoDB events first (multi-event PINs)
    const ev = await getEventByPin(pin);
    if (ev) {
      const token = await signToken({ role: 'user', eventId: ev.eventId });
      logger.info('auth success', { role: 'user', eventId: ev.eventId });
      return json(200, { token, role: 'user' });
    }

    // Fall back to Secrets Manager (admin PIN)
    const role = await authenticate(pin);
    if (!role) return json(401, { error: 'Invalid PIN' });

    const token = await signToken({ role });
    logger.info('auth success', { role });
    return json(200, { token, role });
  } catch (err) {
    logger.error('auth error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
