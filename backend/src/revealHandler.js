import { setRevealed } from './lib/db.js';
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

    await setRevealed();
    logger.info('revealed');
    return json(200, { revealed: true });
  } catch (err) {
    logger.error('reveal error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
