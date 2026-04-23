import { resetState } from './lib/db.js';
import { getUnlockedTileCount } from './lib/schedule.js';
import { logger } from './lib/logger.js';

const SCHEDULE_CONFIG = {
  startDateISO: process.env.START_DATE_ISO,
  timezone: process.env.TIMEZONE,
  tileDropHours: JSON.parse(process.env.TILE_DROP_HOURS || '[]'),
  gridCols: parseInt(process.env.GRID_COLS || '6'),
};

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

    const state = await resetState();
    const now = new Date();
    logger.info('state reset');
    return json(200, {
      scratchedTiles: state.scratchedTiles,
      revealed: state.revealed,
      unlockedTileCount: getUnlockedTileCount(now, SCHEDULE_CONFIG),
      serverTimeISO: now.toISOString(),
    });
  } catch (err) {
    logger.error('reset error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
