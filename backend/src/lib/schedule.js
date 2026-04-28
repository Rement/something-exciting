/**
 * Returns the indices of cards that are unlocked at the given time.
 * A card is unlocked when its unlockAt timestamp is <= now.
 *
 * @param {Date} now
 * @param {Array<{unlockAt?: string}>} cards
 * @returns {number[]} sorted ascending
 */
export function getUnlockedCardIndices(now, cards) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const out = [];
  for (let i = 0; i < cards.length; i++) {
    const at = cards[i]?.unlockAt;
    if (!at) continue;
    if (now >= new Date(at)) out.push(i);
  }
  return out;
}
