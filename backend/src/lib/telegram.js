import { getSecrets } from './secrets.js';

const API_BASE = 'https://api.telegram.org';

export async function sendTelegram({ chatId, text }) {
  const { telegramBotToken } = await getSecrets();
  if (!telegramBotToken) throw new Error('telegramBotToken missing from secrets');
  if (!chatId) throw new Error('chatId required');

  const res = await fetch(`${API_BASE}/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }
  return data.result;
}
