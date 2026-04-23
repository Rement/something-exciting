import { authenticate, signToken } from './lib/auth.js';
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

    const role = authenticate(pin);
    if (!role) return json(401, { error: 'Invalid PIN' });

    const token = signToken(role);
    logger.info('auth success', { role });
    return json(200, { token, role });
  } catch (err) {
    logger.error('auth error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
