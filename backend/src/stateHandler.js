import { getState } from './lib/db.js';
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

export async function handler() {
  try {
    const now = new Date();
    const state = await getState();
    return json(200, {
      scratchedTiles: state.scratchedTiles,
      revealed: state.revealed,
      unlockedTileCount: getUnlockedTileCount(now, SCHEDULE_CONFIG),
      serverTimeISO: now.toISOString(),
    });
  } catch (err) {
    logger.error('state error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
