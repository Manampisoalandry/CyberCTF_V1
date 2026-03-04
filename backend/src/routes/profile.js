const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { serializeUser } = require('../utils/serializers');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const leaderboard = await User.find({})
      .sort({ points: -1, firstBloods: -1, createdAt: 1 })
      .select('_id');

    const rank = leaderboard.findIndex((entry) => entry._id.toString() === req.user._id.toString()) + 1;

    return res.json({
      user: serializeUser(req.user),
      stats: {
        rank,
        solvedChallengesCount: req.user.solvedChallenges.length,
        firstBloods: req.user.firstBloods,
        points: req.user.points
      }
    });
  } catch (error) {
    return next(error);
  }
});

async function updateProfile(req, res, next) {
  try {
    const { username, email, bio } = req.body;
    const user = req.user;

    if (typeof username === 'string' && username.trim()) {
      user.username = username.trim();
    }

    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 400);
    }

    if (typeof email === 'string' && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });

      if (exists) {
        return res.status(409).json({ message: 'Email already in use by another account.' });
      }

      user.email = normalizedEmail;
    }

    await user.save();

    return res.json({
      message: 'Profile updated.',
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePassword(req, res, next) {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password confirmation does not match.' });
    }

    const valid = await req.user.comparePassword(currentPassword);

    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, req.user.passwordHash);
    if (sameAsCurrent) {
      return res.status(400).json({ message: 'Choose a different password from the current one.' });
    }

    req.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.save();

    return res.json({
      message: 'Password updated successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

router.put('/me', requireAuth, updateProfile);
router.patch('/me', requireAuth, updateProfile);
router.patch('/me/password', requireAuth, updatePassword);

module.exports = router;
