const {
  FIRST_BLOOD_BONUS,
  SECOND_BLOOD_BONUS,
  getSolveBonusByOrder
} = require('./scoring');
const { normalizeId } = require('./challengeAccess');

function serializeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified !== false,
    emailVerifiedAt: user.emailVerifiedAt || null,
    points: user.points,
    bio: user.bio,
    firstBloods: user.firstBloods,
    solvedChallengesCount: Array.isArray(user.solvedChallenges) ? user.solvedChallenges.length : 0,
    solvedChallenges: Array.isArray(user.solvedChallenges)
      ? user.solvedChallenges.map((c) => c.toString())
      : [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function mapFiles(challenge) {
  return (challenge.files || []).map((file) => ({
    id: file._id,
    originalName: file.originalName,
    url: file.url,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: file.uploadedAt
  }));
}

function mapPrerequisite(challenge) {
  const prereq = challenge?.prerequisiteChallenge;
  if (!prereq) return null;

  return {
    id: normalizeId(prereq),
    title: prereq.title || undefined,
    type: prereq.type || undefined,
    difficulty: prereq.difficulty || undefined
  };
}

function mapQuizQuestionsForParticipant(challenge) {
  const quizQuestions = Array.isArray(challenge?.quizQuestions) ? challenge.quizQuestions : [];
  return quizQuestions.map((question) => ({
    id: normalizeId(question),
    question: question.question,
    options: Array.isArray(question.options) ? question.options : []
  }));
}

function mapQuizQuestionsForAdmin(challenge) {
  const quizQuestions = Array.isArray(challenge?.quizQuestions) ? challenge.quizQuestions : [];
  return quizQuestions.map((question) => ({
    id: normalizeId(question),
    question: question.question,
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: question.correctAnswer
  }));
}

function buildChallengeMeta(challenge) {
  const solvesCount = (challenge.solves || []).length;
  return {
    solvesCount,
    nextBloodBonus: getSolveBonusByOrder(solvesCount + 1),
    bloodBonusRules: {
      first: FIRST_BLOOD_BONUS,
      second: SECOND_BLOOD_BONUS
    },
    downloadZipUrl: `/api/challenges/${challenge._id}/download.zip`
  };
}

function getSubmissionMode(challenge) {
  return Array.isArray(challenge?.quizQuestions) && challenge.quizQuestions.length > 0 ? 'quiz' : 'flag';
}

function getUnlockedHintIdsForUser(user, challengeId) {
  const unlocked = Array.isArray(user?.unlockedHints) ? user.unlockedHints : [];
  const row = unlocked.find((item) => item?.challenge && item.challenge.toString() === challengeId.toString());
  const ids = Array.isArray(row?.hints) ? row.hints : [];
  return new Set(ids.map((id) => id.toString()));
}

function getHintUnlockDateForUser(user, challengeId, hintId) {
  const history = Array.isArray(user?.hintUnlockHistory) ? user.hintUnlockHistory : [];
  const entry = history.find((item) =>
    item?.challenge &&
    item?.hint &&
    item.challenge.toString() === challengeId.toString() &&
    item.hint.toString() === hintId.toString()
  );
  return entry?.unlockedAt || null;
}

function mapHintsForParticipant(challenge, user) {
  const hints = Array.isArray(challenge?.hints) ? challenge.hints : [];
  const unlockedIds = getUnlockedHintIdsForUser(user, challenge._id);

  return hints.map((hint) => {
    const unlocked = unlockedIds.has(hint._id.toString());
    const unlockedAt = unlocked ? getHintUnlockDateForUser(user, challenge._id, hint._id) : null;
    return {
      id: normalizeId(hint),
      title: hint.title || '',
      cost: hint.cost || 0,
      isFree: Boolean(hint.isFree) || (hint.cost || 0) === 0,
      unlocked,
      unlockedAt,
      content: unlocked ? hint.content : ''
    };
  });
}

function mapHintsForAdmin(challenge) {
  const hints = Array.isArray(challenge?.hints) ? challenge.hints : [];
  return hints.map((hint) => ({
    id: normalizeId(hint),
    title: hint.title || '',
    content: hint.content,
    cost: hint.cost || 0,
    isFree: Boolean(hint.isFree) || (hint.cost || 0) === 0
  }));
}

function serializeChallengeForParticipant(challenge, currentUser) {
  const currentUserId = currentUser?._id;
  const solvedByMe = (challenge.solves || []).some(
    (solve) => solve.user && currentUserId && solve.user.toString() === currentUserId.toString()
  );

  return {
    id: challenge._id,
    title: challenge.title,
    type: challenge.type,
    description: challenge.description,
    difficulty: challenge.difficulty,
    points: challenge.points,
    quizQuestions: mapQuizQuestionsForParticipant(challenge),
    submissionMode: getSubmissionMode(challenge),
    files: mapFiles(challenge),
    hints: mapHintsForParticipant(challenge, currentUser),
    firstBloodUser: challenge.firstBloodUser,
    solvedByMe,
    createdBy: challenge.createdBy,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt,
    isSuspendedUntilPrerequisite: Boolean(challenge.isSuspendedUntilPrerequisite),
    prerequisiteChallenge: mapPrerequisite(challenge),
    ...buildChallengeMeta(challenge)
  };
}

function serializeChallengeForAdmin(challenge) {
  return {
    id: challenge._id,
    title: challenge.title,
    type: challenge.type,
    description: challenge.description,
    difficulty: challenge.difficulty,
    flag: challenge.flag === '__QUIZ__' ? '' : challenge.flag,
    points: challenge.points,
    quizQuestions: mapQuizQuestionsForAdmin(challenge),
    submissionMode: getSubmissionMode(challenge),
    hints: mapHintsForAdmin(challenge),
    files: (challenge.files || []).map((file) => ({
      id: file._id,
      originalName: file.originalName,
      storedName: file.storedName,
      url: file.url,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: file.uploadedAt
    })),
    isSuspendedUntilPrerequisite: Boolean(challenge.isSuspendedUntilPrerequisite),
    prerequisiteChallenge: mapPrerequisite(challenge),
    firstBloodUser: challenge.firstBloodUser,
    solves: challenge.solves,
    solveCount: (challenge.solves || []).length,
    createdBy: challenge.createdBy,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt,
    ...buildChallengeMeta(challenge)
  };
}

module.exports = {
  serializeUser,
  serializeChallengeForParticipant,
  serializeChallengeForAdmin
};
