import { getEventByPin, setEventTelegramChatId } from './lib/db.js';
import { sendTelegram } from './lib/telegram.js';
import { getSecrets } from './lib/secrets.js';
import { logger } from './lib/logger.js';

const ok = () => ({ statusCode: 200, body: '' });

const WELCOME =
  'Привет! 🎁\nЯ твой персональный бот-сюрприз.\nПришли мне свой 4-значный PIN, и я буду присылать тебе подсказки.';

const PIN_OK = (name) =>
  `${name ? name + ', т' : 'Т'}ы в списке ✨\nЖди от меня сообщений в нужные дни.`;

const PIN_BAD = 'Хм, такого PIN я не знаю. Попробуй ещё раз.';

export async function handler(event) {
  try {
    const headers = event.headers || {};
    const provided =
      headers['X-Telegram-Bot-Api-Secret-Token'] ||
      headers['x-telegram-bot-api-secret-token'];
    const { telegramWebhookSecret } = await getSecrets();
    if (!provided || provided !== telegramWebhookSecret) {
      logger.warn('telegram webhook bad secret');
      return { statusCode: 401, body: '' };
    }

    const update = JSON.parse(event.body || '{}');
    const message = update.message;
    if (!message || !message.chat?.id) return ok();

    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (!text || text === '/start') {
      await sendTelegram({ chatId, text: WELCOME });
      return ok();
    }

    const pinMatch = text.match(/\b\d{4,8}\b/);
    if (!pinMatch) {
      await sendTelegram({ chatId, text: PIN_BAD });
      return ok();
    }

    const ev = await getEventByPin(pinMatch[0]);
    if (!ev) {
      await sendTelegram({ chatId, text: PIN_BAD });
      return ok();
    }

    await setEventTelegramChatId(ev.eventId, chatId);
    logger.info('telegram chat linked', { eventId: ev.eventId, chatId });
    await sendTelegram({ chatId, text: PIN_OK(ev.recipientName || '') });
    return ok();
  } catch (err) {
    logger.error('telegram webhook error', { error: err.message });
    // Always 200 — don't make Telegram retry on our bugs
    return ok();
  }
}
