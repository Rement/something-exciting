import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ses = new SESClient({});
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

function loadTemplate(name, vars) {
  let html = readFileSync(join(TEMPLATES_DIR, `${name}.html`), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

export async function sendEmail({ to, from, subject, template, vars }) {
  const html = loadTemplate(template, vars);
  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } },
    },
  }));
}
