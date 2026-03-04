const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { serializeUser } = require('../utils/serializers');
const { requireAuth } = require('../middleware/auth');
const {
  createEmailVerificationToken,
  hashVerificationToken,
  sendVerificationEmail
} = require('../utils/emailVerification');

const router = express.Router();

async function issueVerificationEmail(user) {
  const { rawToken, tokenHash, expiresAt } = createEmailVerificationToken();
  user.emailVerificationToken = tokenHash;
  user.emailVerificationExpiresAt = expiresAt;
  await user.save();
  await sendVerificationEmail({ user, rawToken });
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });

    if (exists) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: String(username).trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'participant',
      emailVerified: false
    });

    await issueVerificationEmail(user);

    return res.status(201).json({
      message: 'Registration successful. Please verify your email before logging in.',
      requiresEmailVerification: true,
      verificationEmailSent: true,
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const valid = await user.comparePassword(password);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role !== 'admin' && user.emailVerified === false) {
      return res.status(403).json({
        message: 'Email not verified. Check your inbox and confirm your account first.',
        requiresEmailVerification: true
      });
    }

    const token = signToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const rawToken = String(req.body?.token || req.query?.token || '').trim();

    if (!rawToken) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const tokenHash = hashVerificationToken(rawToken);
    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or expired.' });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    const token = signToken(user);

    return res.json({
      message: 'Email verified successfully.',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: 'If the account exists, a verification email has been sent.' });
    }

    if (user.role === 'admin' || user.emailVerified !== false) {
      return res.json({ message: 'This account is already verified.' });
    }

    await issueVerificationEmail(user);

    return res.json({ message: 'A new verification email has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

module.exports = router;
