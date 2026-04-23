import { sendEmail } from './lib/ses.js';
import { logger } from './lib/logger.js';

const RECIPIENT = process.env.RECIPIENT_EMAIL;
const SENDER = process.env.SENDER_EMAIL;
const DOMAIN = process.env.DOMAIN;
const APP_TITLE = process.env.APP_TITLE;

const TRIGGERS = {
  launch: {
    subject: 'Something just arrived for you \uD83C\uDF81',
    template: 'launch',
  },
  daily: {
    subject: 'New tiles are waiting for you today',
    template: 'daily',
  },
  'reveal-day': {
    subject: "Today's the day.",
    template: 'reveal-day',
  },
};

export async function handler(event) {
  const trigger = event.trigger;
  const config = TRIGGERS[trigger];
  if (!config) {
    logger.error('unknown trigger', { trigger });
    return { statusCode: 400, error: `Unknown trigger: ${trigger}` };
  }

  try {
    await sendEmail({
      to: RECIPIENT,
      from: SENDER,
      subject: config.subject,
      template: config.template,
      vars: { domain: DOMAIN, appTitle: APP_TITLE },
    });
    logger.info('email sent', { trigger, to: RECIPIENT });
    return { statusCode: 200 };
  } catch (err) {
    logger.error('email failed', { trigger, error: err.message });
    throw err;
  }
}
