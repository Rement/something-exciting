import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getUnlockedTileCount } from './schedule.js';

const config = {
  startDateISO: '2026-05-11T21:00:00-07:00',
  timezone: 'America/Los_Angeles',
  tileDropHours: [8, 10, 12, 14, 16, 18],
  gridCols: 6,
};

// Helper: create a Date from PDT components (May = UTC-7)
function pdt(month, day, hour, min = 0) {
  return new Date(Date.UTC(2026, month - 1, day, hour + 7, min));
}

describe('getUnlockedTileCount', () => {
  it('returns 0 before launch', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 11, 20, 59), config), 0);
    assert.equal(getUnlockedTileCount(pdt(5, 10, 12, 0), config), 0);
  });

  it('returns 6 at launch (May 11, 9pm PDT)', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 11, 21, 0), config), 6);
  });

  it('returns 6 between launch and Day 2 first drop', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 11, 23, 0), config), 6);
    assert.equal(getUnlockedTileCount(pdt(5, 12, 3, 0), config), 6);
    assert.equal(getUnlockedTileCount(pdt(5, 12, 7, 59), config), 6);
  });

  it('returns 7 at Day 2, 8am PDT', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 12, 8, 0), config), 7);
  });

  it('returns 8 at Day 2, 10am PDT', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 12, 10, 0), config), 8);
  });

  it('returns 12 at Day 2, 6pm PDT (last drop of the day)', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 12, 18, 0), config), 12);
  });

  it('returns 12 between Day 2 last drop and Day 3 first drop', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 12, 22, 0), config), 12);
    assert.equal(getUnlockedTileCount(pdt(5, 13, 7, 59), config), 12);
  });

  it('returns 13 at Day 3, 8am PDT', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 13, 8, 0), config), 13);
  });

  it('returns 18 at Day 3, 6pm PDT', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 13, 18, 0), config), 18);
  });

  it('returns 19 at Day 4, 8am PDT', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 14, 8, 0), config), 19);
  });

  it('returns 24 at Day 4, 6pm PDT (all tiles unlocked)', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 14, 18, 0), config), 24);
  });

  it('returns 24 on reveal day and after', () => {
    assert.equal(getUnlockedTileCount(pdt(5, 15, 8, 0), config), 24);
    assert.equal(getUnlockedTileCount(pdt(5, 15, 13, 0), config), 24);
    assert.equal(getUnlockedTileCount(pdt(6, 1, 12, 0), config), 24);
  });

  it('handles exact boundary — one minute before drop', () => {
    // 9:59 AM PDT on Day 2 → tile 8 not yet dropped
    assert.equal(getUnlockedTileCount(pdt(5, 12, 9, 59), config), 7);
  });

  it('handles mid-day count on Day 4', () => {
    // 2pm PDT Day 4 → tiles 19,20,21,22 unlocked (base 18 + 4)
    assert.equal(getUnlockedTileCount(pdt(5, 14, 14, 0), config), 22);
  });
});
