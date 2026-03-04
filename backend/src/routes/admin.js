const express = require('express');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const { serializeUser, serializeChallengeForAdmin } = require('../utils/serializers');
const recalculateScores = require('../utils/recalculateScores');
const { deleteChallengeFiles, deleteUploadedRequestFiles } = require('../utils/fileCleanup');
const { emitToUser, emitToAdmins } = require('../realtime');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

function parseSuspensionPayload(body = {}) {
  const enabledRaw = body.isSuspendedUntilPrerequisite;
  const enabled = ['true', '1', 'on', 'yes'].includes(String(enabledRaw).toLowerCase());
  const prerequisiteChallengeId = body.prerequisiteChallengeId ? String(body.prerequisiteChallengeId).trim() : '';

  return {
    isSuspendedUntilPrerequisite: enabled,
    prerequisiteChallengeId: enabled ? prerequisiteChallengeId : ''
  };
}

async function resolveSuspensionConfig(payload, currentChallengeId) {
  const { isSuspendedUntilPrerequisite, prerequisiteChallengeId } = parseSuspensionPayload(payload);

  if (!isSuspendedUntilPrerequisite) {
    return {
      isSuspendedUntilPrerequisite: false,
      prerequisiteChallenge: null
    };
  }

  if (!prerequisiteChallengeId) {
    throw new Error('Choisis le challenge qui doit être résolu avant de débloquer celui-ci.');
  }

  if (currentChallengeId && String(currentChallengeId) === prerequisiteChallengeId) {
    throw new Error('Un challenge ne peut pas se débloquer lui-même.');
  }

  const prerequisiteChallenge = await Challenge.findById(prerequisiteChallengeId).select('_id');

  if (!prerequisiteChallenge) {
    throw new Error('Le challenge prérequis sélectionné est introuvable.');
  }

  return {
    isSuspendedUntilPrerequisite: true,
    prerequisiteChallenge: prerequisiteChallenge._id
  };
}

function normalizeFlagValue(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized === '__QUIZ__') {
    return '';
  }
  return normalized;
}

function parseQuizQuestions(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;

  if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      return [];
    }
  }

  return [];
}

function parseQuizPayload(body = {}, fallbackType = '') {
  const rawType = String(body.type || fallbackType || '').trim().toLowerCase();
  const fallbackFlag = normalizeFlagValue(body.flag);

  if (rawType !== 'osint') {
    return {
      quizQuestions: [],
      normalizedFlag: fallbackFlag
    };
  }

  const rawQuestions = parseQuizQuestions(body.quizQuestions);

  if (!rawQuestions.length) {
    return {
      quizQuestions: [],
      normalizedFlag: fallbackFlag
    };
  }

  const quizQuestions = rawQuestions
    .map((item, questionIndex) => {
      const question = String(item?.question || '').trim();
      const options = Array.isArray(item?.options)
        ? item.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 6)
        : [];
      const correctAnswer = String(item?.correctAnswer || '').trim();

      if (!question) {
        throw new Error(`Ajoute l'intitulé de la question ${questionIndex + 1} du quiz OSINT.`);
      }

      if (options.length < 2) {
        throw new Error(`Ajoute au moins 2 choix pour la question ${questionIndex + 1} du quiz OSINT.`);
      }

      if (!correctAnswer || !options.includes(correctAnswer)) {
        throw new Error(`La bonne réponse de la question ${questionIndex + 1} doit correspondre à l’un des choix proposés.`);
      }

      return {
        question,
        options,
        correctAnswer
      };
    })
    .slice(0, 10);

  return {
    quizQuestions,
    normalizedFlag: '__QUIZ__'
  };
}

function parseHintsPayload(body = {}) {
  const raw = body.hints;

  if (!raw) return [];

  let parsed = [];
  if (Array.isArray(raw)) {
    parsed = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const obj = JSON.parse(raw);
      if (Array.isArray(obj)) parsed = obj;
    } catch (_error) {
      parsed = [];
    }
  }

  return parsed
    .map((item, index) => {
      const content = String(item?.content || '').trim();
      const title = String(item?.title || '').trim();
      const costRaw = item?.cost;
      const cost = Number.isFinite(Number(costRaw)) ? Math.max(0, Math.min(10000, Number(costRaw))) : 0;

      if (!content) {
        throw new Error(`Le hint ${index + 1} doit contenir un texte.`);
      }

      return {
        title,
        content,
        cost
      };
    })
    .slice(0, 20);
}

router.post('/maintenance/recalculate-scores', async (_req, res, next) => {
  try {
    const summary = await recalculateScores();
    return res.json({
      message: 'Scores recalculated successfully.',
      summary
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/challenges', async (_req, res, next) => {
  try {
    const challenges = await Challenge.find({})
      .populate('prerequisiteChallenge', 'title type difficulty')
      .sort({ createdAt: -1 });

    return res.json({
      challenges: challenges.map(serializeChallengeForAdmin)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/challenges', upload.array('files', 10), async (req, res, next) => {
  let challengeCreated = false;

  try {
    const { title, type, description, difficulty = 'Easy', points } = req.body;

    if (!title || !type || !description || !points) {
      deleteUploadedRequestFiles(req.files || []);
      return res.status(400).json({
        message: 'title, type, description and points are required.'
      });
    }

    const suspensionConfig = await resolveSuspensionConfig(req.body);
    const quizConfig = parseQuizPayload(req.body);
    const hints = parseHintsPayload(req.body);

    if (!quizConfig.normalizedFlag) {
      deleteUploadedRequestFiles(req.files || []);
      return res.status(400).json({
        message: 'Ajoute une flag pour un challenge classique, ou configure un quiz OSINT complet.'
      });
    }

    const files = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      url: `/uploads/challenges/${file.filename}`,
      pathOnDisk: file.path,
      size: file.size,
      mimetype: file.mimetype
    }));

    const challenge = await Challenge.create({
      title: String(title).trim(),
      type: String(type).trim(),
      description: String(description).trim(),
      difficulty,
      flag: quizConfig.normalizedFlag,
      points: Number(points),
      quizQuestions: quizConfig.quizQuestions,
      hints,
      files,
      ...suspensionConfig,
      createdBy: req.user._id
    });

    challengeCreated = true;
    await challenge.populate('prerequisiteChallenge', 'title type difficulty');

    return res.status(201).json({
      message: 'Challenge created.',
      challenge: serializeChallengeForAdmin(challenge)
    });
  } catch (error) {
    if (!challengeCreated) {
      deleteUploadedRequestFiles(req.files || []);
    }
    return next(error);
  }
});

async function updateChallenge(req, res, next) {
  let challengeSaved = false;

  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      deleteUploadedRequestFiles(req.files || []);
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    const { title, type, description, difficulty, points } = req.body;

    if (typeof title === 'string' && title.trim()) challenge.title = title.trim();
    if (typeof type === 'string' && type.trim()) challenge.type = type.trim();
    if (typeof description === 'string' && description.trim()) challenge.description = description.trim();
    if (typeof difficulty === 'string' && difficulty.trim()) challenge.difficulty = difficulty.trim();
    if (typeof points !== 'undefined' && points !== '') challenge.points = Number(points);

    const suspensionConfig = await resolveSuspensionConfig(req.body, challenge._id.toString());
    const effectiveType = typeof req.body.type === 'string' && req.body.type.trim() ? req.body.type : challenge.type;
    const fallbackFlag = typeof req.body.flag === 'string' ? req.body.flag : challenge.flag;
    const quizConfig = parseQuizPayload({ ...req.body, type: effectiveType, flag: fallbackFlag }, effectiveType);

    const hints = parseHintsPayload(req.body);

    if (!quizConfig.normalizedFlag) {
      deleteUploadedRequestFiles(req.files || []);
      return res.status(400).json({
        message: 'Ajoute une flag pour un challenge classique, ou configure un quiz OSINT complet.'
      });
    }

    challenge.flag = quizConfig.normalizedFlag;
    challenge.quizQuestions = quizConfig.quizQuestions;
    challenge.hints = hints;
    challenge.isSuspendedUntilPrerequisite = suspensionConfig.isSuspendedUntilPrerequisite;
    challenge.prerequisiteChallenge = suspensionConfig.prerequisiteChallenge;

    const newFiles = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      url: `/uploads/challenges/${file.filename}`,
      pathOnDisk: file.path,
      size: file.size,
      mimetype: file.mimetype
    }));

    if (newFiles.length) {
      challenge.files.push(...newFiles);
    }

    await challenge.save();
    challengeSaved = true;
    await challenge.populate('prerequisiteChallenge', 'title type difficulty');

    if (challenge.solves.length) {
      await recalculateScores();
    }

    return res.json({
      message: 'Challenge updated.',
      challenge: serializeChallengeForAdmin(challenge)
    });
  } catch (error) {
    if (!challengeSaved) {
      deleteUploadedRequestFiles(req.files || []);
    }
    return next(error);
  }
}

router.put('/challenges/:challengeId', upload.array('files', 10), updateChallenge);
router.patch('/challenges/:challengeId', upload.array('files', 10), updateChallenge);

router.delete('/challenges/:challengeId', async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    await Challenge.updateMany(
      { prerequisiteChallenge: challenge._id },
      {
        $set: {
          isSuspendedUntilPrerequisite: false,
          prerequisiteChallenge: null
        }
      }
    );

    const cleanupSummary = deleteChallengeFiles(challenge);
    await challenge.deleteOne();
    const summary = await recalculateScores();

    return res.json({
      message: 'Challenge deleted. Attached files were cleaned up automatically.',
      cleanupSummary,
      summary
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });

    return res.json({
      users: users.map(serializeUser)
    });
  } catch (error) {
    return next(error);
  }
});

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { username, email, bio, role } = req.body;

    if (typeof username === 'string' && username.trim()) user.username = username.trim();
    if (typeof bio === 'string') user.bio = bio.trim().slice(0, 400);
    if (typeof role === 'string' && ['admin', 'participant'].includes(role)) user.role = role;

    if (typeof email === 'string' && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const exists = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id }
      });

      if (exists) {
        return res.status(409).json({ message: 'Email already in use.' });
      }

      user.email = normalizedEmail;
    }

    await user.save();

    return res.json({
      message: 'User updated.',
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

router.put('/users/:userId', updateUser);
router.patch('/users/:userId', updateUser);

router.delete('/users/:userId', async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ message: 'You cannot delete your own logged-in admin account.' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const challenges = await Challenge.find({ 'solves.user': user._id });

    for (const challenge of challenges) {
      challenge.solves = challenge.solves.filter(
        (solve) => solve.user.toString() !== user._id.toString()
      );

      if (challenge.firstBloodUser && challenge.firstBloodUser.toString() === user._id.toString()) {
        challenge.firstBloodUser = null;
      }

      await challenge.save();
    }

    await user.deleteOne();
    const summary = await recalculateScores();

    return res.json({
      message: 'User deleted. Related solves were removed and scores were recalculated.',
      summary
    });
  } catch (error) {
    return next(error);
  }
});


// --------------------
// Support tickets
// --------------------

router.get('/tickets', async (_req, res, next) => {
  try {
    const tickets = await Ticket.find({})
      .populate('createdBy', 'username email')
      .sort({ updatedAt: -1 });

    return res.json({ tickets });
  } catch (error) {
    return next(error);
  }
});

router.post('/tickets/:ticketId/reply', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: 'content is required.' });
    }

    ticket.messages.push({
      senderRole: 'admin',
      sender: req.user._id,
      content,
      unreadForParticipant: true
    });

    ticket.status = 'open';
    await ticket.save();

    await ticket.populate('createdBy', 'username email');

    const unreadCount = (ticket.messages || []).filter((m) => m.senderRole === 'admin' && m.unreadForParticipant).length;

    emitToUser(ticket.createdBy?._id || ticket.createdBy, 'ticket:update', {
      id: `ticket:update:${ticket._id.toString()}:${Date.now()}`,
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      status: ticket.status,
      unreadCount,
      message: 'Nouvelle réponse de l’admin sur ton ticket.',
      preview: content.slice(0, 160),
      createdAt: new Date().toISOString()
    });

    emitToAdmins('ticket:admin-reply', {
      id: `ticket:admin-reply:${ticket._id.toString()}:${Date.now()}`,
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Reply sent.', ticket });
  } catch (error) {
    return next(error);
  }
});

router.patch('/tickets/:ticketId/close', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    ticket.status = 'closed';
    await ticket.save();
    await ticket.populate('createdBy', 'username email');

    emitToUser(ticket.createdBy?._id || ticket.createdBy, 'ticket:update', {
      id: `ticket:closed:${ticket._id.toString()}:${Date.now()}`,
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      status: ticket.status,
      unreadCount: (ticket.messages || []).filter((m) => m.senderRole === 'admin' && m.unreadForParticipant).length,
      message: 'Ton ticket a été fermé par un admin.',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Ticket closed.', ticket });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
