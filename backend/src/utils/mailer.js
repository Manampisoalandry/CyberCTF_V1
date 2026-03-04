const nodemailer = require('nodemailer');

let cachedTransporter = null;

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return cachedTransporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@cyberctf.local';
  const transporter = getTransporter();

  if (!transporter) {
    console.log('[mail:disabled] No SMTP config provided. Email not sent.');
    console.log({ to, subject, text });
    return { skipped: true };
  }

  const info = await transporter.sendMail({ from, to, subject, text, html });
  return { skipped: false, messageId: info.messageId };
}

module.exports = {
  hasSmtpConfig,
  sendMail
};
