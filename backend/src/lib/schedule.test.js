import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getUnlockedCardIndices } from './schedule.js';

const cards = [
  { unlockAt: '2026-05-11T21:00:00-07:00' }, // 0 — start
  { unlockAt: '2026-05-12T08:00:00-07:00' }, // 1
  { unlockAt: '2026-05-12T10:00:00-07:00' }, // 2
  { unlockAt: '2026-05-15T13:00:00-07:00' }, // 3 — end
];

function pdt(month, day, hour, min = 0) {
  return new Date(Date.UTC(2026, month - 1, day, hour + 7, min));
}

describe('getUnlockedCardIndices', () => {
  it('returns [] before any card unlocks', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 11, 20, 59), cards), []);
  });

  it('returns [0] exactly at the first unlockAt', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 11, 21, 0), cards), [0]);
  });

  it('returns [0] one minute before the next unlock', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 7, 59), cards), [0]);
  });

  it('returns [0,1] at the second unlockAt', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 8, 0), cards), [0, 1]);
  });

  it('returns [0,1,2] mid-schedule', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 11, 0), cards), [0, 1, 2]);
  });

  it('returns all indices after final unlock', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 15, 13, 0), cards), [0, 1, 2, 3]);
    assert.deepEqual(getUnlockedCardIndices(pdt(6, 1, 12, 0), cards), [0, 1, 2, 3]);
  });

  it('skips cards without unlockAt', () => {
    const partial = [
      { unlockAt: '2026-05-11T21:00:00-07:00' },
      {},
      { unlockAt: '2026-05-12T08:00:00-07:00' },
    ];
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 9, 0), partial), [0, 2]);
  });

  it('returns [] for empty or missing array', () => {
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 9, 0), []), []);
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 9, 0), null), []);
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 9, 0), undefined), []);
  });

  it('handles unsorted unlock times correctly (each card evaluated independently)', () => {
    const unsorted = [
      { unlockAt: '2026-05-15T13:00:00-07:00' },
      { unlockAt: '2026-05-11T21:00:00-07:00' },
      { unlockAt: '2026-05-12T08:00:00-07:00' },
    ];
    assert.deepEqual(getUnlockedCardIndices(pdt(5, 12, 9, 0), unsorted), [1, 2]);
  });
});
