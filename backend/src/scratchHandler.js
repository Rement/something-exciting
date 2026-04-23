import { scratchTile } from './lib/db.js';
import { getUnlockedTileCount } from './lib/schedule.js';
import { logger } from './lib/logger.js';

const TOTAL_TILES = parseInt(process.env.GRID_COLS || '6') * parseInt(process.env.GRID_ROWS || '4');
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
    const { tileIndex } = JSON.parse(event.body || '{}');
    if (tileIndex == null || tileIndex < 0 || tileIndex >= TOTAL_TILES) {
      return json(400, { error: 'Invalid tile index' });
    }

    const now = new Date();
    const unlocked = getUnlockedTileCount(now, SCHEDULE_CONFIG);
    if (tileIndex >= unlocked) {
      return json(403, { error: 'Tile not yet unlocked' });
    }

    const state = await scratchTile(tileIndex);
    logger.info('tile scratched', { tileIndex });
    return json(200, {
      scratchedTiles: state.scratchedTiles,
      revealed: state.revealed,
      unlockedTileCount: unlocked,
      serverTimeISO: now.toISOString(),
    });
  } catch (err) {
    logger.error('scratch error', { error: err.message });
    return json(500, { error: 'Internal server error' });
  }
}
