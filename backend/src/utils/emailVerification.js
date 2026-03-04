const crypto = require('crypto');
const { sendMail } = require('./mailer');

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  return {
    rawToken,
    tokenHash,
    expiresAt
  };
}

function getFrontendBaseUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN ||
    'http://192.168.1.100:3000'
  ).replace(/\/$/, '');
}

function buildEmailVerificationUrl(rawToken) {
  return `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

async function sendVerificationEmail({ user, rawToken }) {
  const verifyUrl = buildEmailVerificationUrl(rawToken);
  const subject = 'Confirme ton email CyberCTF';
  const text = [
    `Bonjour ${user.username},`,
    '',
    'Confirme ton email pour activer ton compte CyberCTF :',
    verifyUrl,
    '',
    'Ce lien expire dans 24 heures.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#111827;">Confirme ton email</h2>
      <p>Bonjour <strong>${user.username}</strong>,</p>
      <p>Bienvenue sur <strong>CyberCTF</strong>. Clique sur le bouton ci-dessous pour activer ton compte.</p>
      <p style="margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#22c55e;color:white;text-decoration:none;font-weight:700;">Confirmer mon email</a>
      </p>
      <p>Si le bouton ne fonctionne pas, copie/colle ce lien :</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#6b7280;">Ce lien expire dans 24 heures.</p>
    </div>
  `;

  return sendMail({
    to: user.email,
    subject,
    text,
    html
  });
}

module.exports = {
  hashVerificationToken,
  createEmailVerificationToken,
  buildEmailVerificationUrl,
  sendVerificationEmail
};
