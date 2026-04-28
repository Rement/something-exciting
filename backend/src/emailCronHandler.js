import { sendTelegram } from './lib/telegram.js';
import { listEvents, addNotifiedTiles } from './lib/db.js';
import { getUnlockedCardIndices } from './lib/schedule.js';
import { logger } from './lib/logger.js';

const DOMAIN = process.env.DOMAIN;
const TOTAL_CARDS = 26;

function tileMessage(card, index, total, recipientName) {
  const icon = card?.icon || '🎁';
  const greeting = recipientName ? `${recipientName}, ` : '';
  if (index === 0) {
    return `${icon} ${greeting}первая карточка готова.\nОткрывай: https://${DOMAIN}`;
  }
  if (index === total - 1) {
    return `${icon} ${greeting}последняя карточка ждёт тебя.\nhttps://${DOMAIN}`;
  }
  return `${icon} Новая карточка ${index + 1} из ${total}.\nhttps://${DOMAIN}`;
}

export async function handler(event) {
  const trigger = event.trigger || 'tile-unlock';

  const events = await listEvents();
  const now = new Date();
  let sent = 0;

  for (const ev of events) {
    if (!ev.telegramChatId) continue;
    if (ev.scratchedTiles?.includes(TOTAL_CARDS - 1)) continue;

    const unlocked = getUnlockedCardIndices(now, ev.cards);
    const notified = new Set(ev.notifiedTiles || []);
    const toNotify = unlocked.filter((i) => !notified.has(i));
    if (!toNotify.length) continue;

    const successfullyNotified = [];
    for (const idx of toNotify) {
      try {
        await sendTelegram({
          chatId: ev.telegramChatId,
          text: tileMessage(ev.cards[idx], idx, TOTAL_CARDS, ev.recipientName),
        });
        successfullyNotified.push(idx);
        sent++;
      } catch (err) {
        logger.error('telegram failed', {
          trigger,
          chatId: ev.telegramChatId,
          eventId: ev.eventId,
          tileIndex: idx,
          error: err.message,
        });
      }
    }

    if (successfullyNotified.length) {
      await addNotifiedTiles(ev.eventId, successfullyNotified);
      logger.info('tiles notified', {
        eventId: ev.eventId,
        tiles: successfullyNotified,
      });
    }
  }

  return { statusCode: 200, sent };
}
