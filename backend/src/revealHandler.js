import { logger } from './lib/logger.js';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler() {
  logger.info('reveal endpoint called — no-op in card model');
  return json(410, { error: 'Reveal endpoint removed; use cards instead' });
}
