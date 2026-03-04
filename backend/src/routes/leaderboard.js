const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const users = await User.find({})
      .sort({ points: -1, firstBloods: -1, createdAt: 1 })
      .select('username role points firstBloods solvedChallenges createdAt');

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      username: user.username,
      role: user.role,
      points: user.points,
      firstBloods: user.firstBloods,
      solvedChallengesCount: user.solvedChallenges.length,
      createdAt: user.createdAt,
      isCurrentUser: user._id.toString() === req.user._id.toString()
    }));

    return res.json({ leaderboard });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
