import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Returns the number of tiles unlocked at the given time.
 *
 * Day 1 (launch): gridCols tiles available immediately.
 * Days 2–4: one tile per drop hour, sequentially.
 *
 * @param {Date} now
 * @param {{ startDateISO: string, timezone: string, tileDropHours: number[], gridCols: number }} config
 * @returns {number}
 */
export function getUnlockedTileCount(now, config) {
  const { startDateISO, timezone, tileDropHours, gridCols } = config;
  const start = new Date(startDateISO);

  if (now < start) return 0;

  // Determine the calendar date of launch in the target timezone
  const zonedStart = toZonedTime(start, timezone);
  const y = zonedStart.getFullYear();
  const m = zonedStart.getMonth();
  const d = zonedStart.getDate();

  let count = gridCols; // Day 1 tiles

  // Days 2, 3, 4 → next 3 calendar days after launch
  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    for (const hour of tileDropHours) {
      const dropTime = fromZonedTime(new Date(y, m, d + dayOffset, hour, 0, 0), timezone);
      if (now >= dropTime) {
        count++;
      } else {
        return count;
      }
    }
  }

  return count; // 24
}
