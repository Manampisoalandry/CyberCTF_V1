const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function bootstrapAdmin() {
  const adminCount = await User.countDocuments({ role: 'admin' });

  if (adminCount > 0) {
    await User.updateMany(
      { role: 'admin', $or: [{ emailVerified: false }, { emailVerified: { $exists: false } }] },
      { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
    );
    return;
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = (process.env.ADMIN_EMAIL || 'admin@ctf.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    username,
    email,
    passwordHash,
    role: 'admin',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    bio: 'Default platform administrator'
  });

  console.log(`Default admin created: ${email}`);
}

module.exports = bootstrapAdmin;
