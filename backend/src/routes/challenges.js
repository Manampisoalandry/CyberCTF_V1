const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Challenge = require('../models/Challenge');
const { requireAuth } = require('../middleware/auth');
const { serializeChallengeForParticipant } = require('../utils/serializers');
const {
  submissionRateLimit,
  preventDuplicateSubmit
} = require('../middleware/submitGuards');
const {
  FIRST_BLOOD_BONUS,
  SECOND_BLOOD_BONUS,
  getSolveBonusByOrder
} = require('../utils/scoring');
const {
  canUserAccessChallenge,
  getChallengeLockReason
} = require('../utils/challengeAccess');
const { emitSolveActivity, emitToUser } = require('../realtime');

const router = express.Router();

function safeArchiveName(title) {
  return String(title || 'challenge')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'challenge';
}

async function loadChallengeForUser(challengeId) {
  return Challenge.findById(challengeId)
    .populate('prerequisiteChallenge', 'title type difficulty');
}

function ensureParticipantAccess(challenge, req, res) {
  if (canUserAccessChallenge(challenge, req.user)) {
    return true;
  }

  res.status(403).json({ message: getChallengeLockReason(challenge) });
  return false;
}

function parseSubmittedAnswers(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || '').trim());
  }

  if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim());
      }
    } catch (_error) {
      return [];
    }
  }

  return [];
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const challenges = await Challenge.find({})
      .sort({ createdAt: -1 })
      .select('-flag')
      .populate('prerequisiteChallenge', 'title type difficulty');

    const visibleChallenges = challenges.filter((challenge) =>
      canUserAccessChallenge(challenge, req.user)
    );

    return res.json({
      challenges: visibleChallenges.map((challenge) =>
        serializeChallengeForParticipant(challenge, req.user)
      )
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/activity/feed', requireAuth, async (req, res, next) => {
  try {
    const limitValue = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 30) : 12;

    const challenges = await Challenge.find({ 'solves.0': { $exists: true } })
      .select('title type difficulty points solves firstBloodUser isSuspendedUntilPrerequisite prerequisiteChallenge')
      .populate('prerequisiteChallenge', 'title type difficulty')
      .populate('solves.user', 'username');

    const visibleChallenges = challenges.filter((challenge) =>
      canUserAccessChallenge(challenge, req.user)
    );

    const events = visibleChallenges
      .flatMap((challenge) =>
        (challenge.solves || []).map((solve) => ({
          id: `${challenge._id.toString()}:${solve._id ? solve._id.toString() : new Date(solve.submittedAt || Date.now()).getTime()}`,
          type: 'solve',
          challengeId: challenge._id,
          challengeTitle: challenge.title,
          challengeType: challenge.type,
          challengeDifficulty: challenge.difficulty,
          actorId: solve.user?._id || solve.user || null,
          actorName: solve.user?.username || 'Participant',
          submittedAt: solve.submittedAt,
          solveOrder: solve.solveOrder || 0,
          bonusAwarded: solve.bonusAwarded || 0,
          basePoints: challenge.points || 0,
          totalAwarded: (challenge.points || 0) + (solve.bonusAwarded || 0),
          firstBlood: (solve.solveOrder || 0) === 1
        }))
      )
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      .slice(0, limit);

    return res.json({ events });
  } catch (error) {
    return next(error);
  }
});

router.get('/:challengeId/download.zip', requireAuth, async (req, res, next) => {
  try {
    const challenge = await loadChallengeForUser(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    if (!ensureParticipantAccess(challenge, req, res)) {
      return;
    }

    if (!challenge.files.length) {
      return res.status(404).json({ message: 'This challenge does not have downloadable files.' });
    }

    const archiveName = `${safeArchiveName(challenge.title)}-files.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (error) => {
      if (!res.headersSent) {
        return next(error);
      }
      res.destroy(error);
    });

    archive.pipe(res);

    for (const file of challenge.files) {
      if (file.pathOnDisk && fs.existsSync(file.pathOnDisk)) {
        archive.file(path.resolve(file.pathOnDisk), {
          name: file.originalName || file.storedName || 'file'
        });
      }
    }

    await archive.finalize();
  } catch (error) {
    return next(error);
  }
});

router.get('/:challengeId', requireAuth, async (req, res, next) => {
  try {
    const challenge = await loadChallengeForUser(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    if (!ensureParticipantAccess(challenge, req, res)) {
      return;
    }

    return res.json({
      challenge: serializeChallengeForParticipant(challenge, req.user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:challengeId/hints/:hintId/unlock', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can unlock hints.' });
    }

    const challenge = await loadChallengeForUser(req.params.challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    if (!ensureParticipantAccess(challenge, req, res)) {
      return;
    }

    const hint = (challenge.hints || []).find((h) => h._id && h._id.toString() === req.params.hintId);
    if (!hint) {
      return res.status(404).json({ message: 'Hint not found.' });
    }

    const challengeIdStr = challenge._id.toString();
    const unlockedRows = Array.isArray(req.user.unlockedHints) ? req.user.unlockedHints : [];
    const row = unlockedRows.find((r) => r.challenge && r.challenge.toString() === challengeIdStr);
    const alreadyUnlocked = Boolean(row && Array.isArray(row.hints) && row.hints.some((id) => id.toString() === hint._id.toString()));

    const history = Array.isArray(req.user.hintUnlockHistory) ? req.user.hintUnlockHistory : [];
    const existingHistory = history.find((entry) =>
      entry?.challenge &&
      entry?.hint &&
      entry.challenge.toString() === challengeIdStr &&
      entry.hint.toString() === hint._id.toString()
    );

    if (alreadyUnlocked) {
      return res.json({
        message: existingHistory?.unlockedAt
          ? `Hint already unlocked le ${new Date(existingHistory.unlockedAt).toLocaleString('fr-FR')}.`
          : 'Hint already unlocked.',
        alreadyUnlocked: true,
        hint: {
          id: hint._id,
          title: hint.title || '',
          content: hint.content,
          cost: hint.cost || 0,
          isFree: (hint.cost || 0) === 0,
          unlockedAt: existingHistory?.unlockedAt || null
        },
        points: req.user.points
      });
    }

    const cost = Number(hint.cost || 0);
    if (cost > 0) {
      if ((req.user.points || 0) < cost) {
        return res.status(400).json({ message: `Not enough points to unlock this hint (${cost} pts).` });
      }
      req.user.points = Math.max(0, (req.user.points || 0) - cost);
    }

    if (row) {
      row.hints = Array.isArray(row.hints) ? row.hints : [];
      row.hints.push(hint._id);
    } else {
      req.user.unlockedHints = unlockedRows;
      req.user.unlockedHints.push({ challenge: challenge._id, hints: [hint._id] });
    }

    req.user.hintUnlockHistory = history;
    req.user.hintUnlockHistory.push({ challenge: challenge._id, hint: hint._id, unlockedAt: new Date() });

    await req.user.save();

    const latestHistory = req.user.hintUnlockHistory[req.user.hintUnlockHistory.length - 1];

    emitToUser(req.user._id, 'hint:unlocked', {
      id: `hint:${challenge._id.toString()}:${hint._id.toString()}:${new Date(latestHistory?.unlockedAt || Date.now()).getTime()}` ,
      challengeId: challenge._id.toString(),
      challengeTitle: challenge.title,
      hintId: hint._id.toString(),
      title: hint.title || `Hint ${((challenge.hints || []).findIndex((item) => item._id.toString() === hint._id.toString()) + 1) || ''}`.trim(),
      cost,
      points: req.user.points,
      unlockedAt: latestHistory?.unlockedAt || null
    });

    return res.json({
      message: cost > 0 ? `Hint unlocked (-${cost} pts).` : 'Hint unlocked.',
      alreadyUnlocked: false,
      hint: {
        id: hint._id,
        title: hint.title || '',
        content: hint.content,
        cost,
        isFree: cost === 0,
        unlockedAt: latestHistory?.unlockedAt || null
      },
      points: req.user.points
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/:challengeId/submit',
  requireAuth,
  submissionRateLimit,
  preventDuplicateSubmit,
  async (req, res, next) => {
    try {
      if (req.user.role !== 'participant') {
        return res.status(403).json({ message: 'Only participants can submit flags.' });
      }

      const challenge = await loadChallengeForUser(req.params.challengeId);

      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found.' });
      }

      if (!ensureParticipantAccess(challenge, req, res)) {
        return;
      }

      const challengeIdString = challenge._id.toString();
      const userIdString = req.user._id.toString();
      const isQuizMode = Array.isArray(challenge.quizQuestions) && challenge.quizQuestions.length > 0;

      const alreadySolvedInProfile = req.user.solvedChallenges.some(
        (challengeId) => challengeId.toString() === challengeIdString
      );
      const alreadySolvedInChallenge = challenge.solves.some(
        (solve) => solve.user && solve.user.toString() === userIdString
      );

      if (alreadySolvedInProfile || alreadySolvedInChallenge) {
        return res.status(409).json({ message: 'Challenge already solved by this user.' });
      }

      if (isQuizMode) {
        const submittedAnswers = parseSubmittedAnswers(req.body.answers);

        if (submittedAnswers.length !== challenge.quizQuestions.length || submittedAnswers.some((item) => !item)) {
          return res.status(400).json({ message: 'answers are required for this quiz.' });
        }

        const allCorrect = challenge.quizQuestions.every((question, index) => (
          submittedAnswers[index] === String(question.correctAnswer || '').trim()
        ));

        if (!allCorrect) {
          return res.status(400).json({ message: 'Incorrect answer.' });
        }
      } else {
        const flag = typeof req.body.flag === 'string' ? req.body.flag.trim() : '';

        if (!flag) {
          return res.status(400).json({ message: 'flag is required.' });
        }

        if (flag !== challenge.flag) {
          return res.status(400).json({ message: 'Incorrect flag.' });
        }
      }

      const solveOrder = challenge.solves.length + 1;
      const bonusAwarded = getSolveBonusByOrder(solveOrder);
      const totalAwarded = challenge.points + bonusAwarded;
      const isFirstSolve = solveOrder === 1;

      challenge.solves.push({
        user: req.user._id,
        submittedAt: new Date(),
        solveOrder,
        bonusAwarded
      });

      if (isFirstSolve) {
        challenge.firstBloodUser = req.user._id;
        req.user.firstBloods += 1;
      }

      req.user.points += totalAwarded;
      req.user.solvedChallenges.push(challenge._id);

      await Promise.all([challenge.save(), req.user.save()]);

      const latestSolve = challenge.solves[challenge.solves.length - 1];
      const submittedAt = latestSolve?.submittedAt || new Date();

      emitSolveActivity({
        id: `${challenge._id.toString()}:${latestSolve?._id ? latestSolve._id.toString() : new Date(submittedAt).getTime()}`,
        type: 'solve',
        challengeId: challenge._id.toString(),
        challengeTitle: challenge.title,
        challengeType: challenge.type,
        challengeDifficulty: challenge.difficulty,
        actorId: req.user._id.toString(),
        actorName: req.user.username,
        submittedAt,
        solveOrder,
        bonusAwarded,
        basePoints: challenge.points || 0,
        totalAwarded,
        firstBlood: isFirstSolve
      });

      const newlyUnlockedChallenges = await Challenge.find({
        isSuspendedUntilPrerequisite: true,
        prerequisiteChallenge: challenge._id
      }).select('title type difficulty points');

      newlyUnlockedChallenges.forEach((row) => {
        emitToUser(req.user._id, 'challenge:unlocked', {
          id: `unlock:${row._id.toString()}:${Date.now()}`,
          challengeId: row._id.toString(),
          title: row.title,
          type: row.type,
          difficulty: row.difficulty,
          points: row.points || 0,
          prerequisiteTitle: challenge.title,
          unlockedAt: new Date().toISOString()
        });
      });

      let message = `${isQuizMode ? 'Quiz validé' : 'Correct flag'}. +${challenge.points} points.`;
      if (solveOrder === 1) {
        message = `${isQuizMode ? 'Quiz validé' : 'Correct flag'}. First blood! +${challenge.points} base +${FIRST_BLOOD_BONUS} speed bonus.`;
      } else if (solveOrder === 2) {
        message = `${isQuizMode ? 'Quiz validé' : 'Correct flag'}. Second solve! +${challenge.points} base +${SECOND_BLOOD_BONUS} speed bonus.`;
      }

      return res.json({
        message,
        result: {
          challengeId: challenge._id,
          solveOrder,
          basePoints: challenge.points,
          bonusAwarded,
          totalAwarded,
          firstBlood: isFirstSolve,
          totalPoints: req.user.points,
          solvedChallengesCount: req.user.solvedChallenges.length,
          solvedChallenges: req.user.solvedChallenges.map((item) => item.toString())
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
