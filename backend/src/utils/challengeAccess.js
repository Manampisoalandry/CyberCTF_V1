function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
}

function userSolvedChallenge(user, challengeId) {
  if (!user || !challengeId) return false;
  const target = normalizeId(challengeId);
  const solved = Array.isArray(user.solvedChallenges) ? user.solvedChallenges : [];
  return solved.some((item) => normalizeId(item) === target);
}

function getBlockingChallengeId(challenge) {
  if (!challenge?.isSuspendedUntilPrerequisite) return '';
  return normalizeId(challenge.prerequisiteChallenge);
}

function canUserAccessChallenge(challenge, user) {
  if (!challenge) return false;
  if (!user) return false;
  if (user.role === 'admin') return true;

  const blockingId = getBlockingChallengeId(challenge);
  if (!blockingId) return true;

  return userSolvedChallenge(user, blockingId);
}

function getChallengeLockReason(challenge) {
  const prereq = challenge?.prerequisiteChallenge;
  const title = prereq?.title || 'un autre challenge';
  return `Ce challenge est suspendu jusqu’à ce que tu résolves ${title}.`;
}

module.exports = {
  normalizeId,
  userSolvedChallenge,
  getBlockingChallengeId,
  canUserAccessChallenge,
  getChallengeLockReason
};
