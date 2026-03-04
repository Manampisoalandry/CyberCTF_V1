const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { getSolveBonusByOrder } = require('./scoring');

function sortSolves(solves = []) {
  return [...solves].sort((a, b) => {
    const dateA = a?.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const dateB = b?.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;

    const idA = a?._id ? String(a._id) : '';
    const idB = b?._id ? String(b._id) : '';
    return idA.localeCompare(idB);
  });
}

async function recalculateScores() {
  const [users, challenges] = await Promise.all([
    User.find({}),
    Challenge.find({})
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  for (const user of users) {
    user.points = 0;
    user.firstBloods = 0;
    user.solvedChallenges = [];
  }

  let droppedSolveRefs = 0;
  let processedSolves = 0;

  for (const challenge of challenges) {
    const sortedSolves = sortSolves(challenge.solves);
    const validSolves = [];

    for (const solve of sortedSolves) {
      const userId = solve?.user ? String(solve.user) : null;
      if (!userId || !userMap.has(userId)) {
        droppedSolveRefs += 1;
        continue;
      }
      validSolves.push(solve);
    }

    challenge.solves = validSolves.map((solve, index) => ({
      _id: solve._id,
      user: solve.user,
      submittedAt: solve.submittedAt || new Date(),
      solveOrder: index + 1,
      bonusAwarded: getSolveBonusByOrder(index + 1)
    }));

    challenge.firstBloodUser = challenge.solves[0]?.user || null;

    for (const solve of challenge.solves) {
      const user = userMap.get(String(solve.user));
      if (!user) continue;

      processedSolves += 1;
      user.points += Number(challenge.points || 0) + Number(solve.bonusAwarded || 0);

      const alreadyTracked = user.solvedChallenges.some(
        (challengeId) => challengeId.toString() === challenge._id.toString()
      );

      if (!alreadyTracked) {
        user.solvedChallenges.push(challenge._id);
      }
    }

    if (challenge.firstBloodUser) {
      const firstUser = userMap.get(String(challenge.firstBloodUser));
      if (firstUser) {
        firstUser.firstBloods += 1;
      }
    }

    await challenge.save();
  }

  for (const user of users) {
    await user.save();
  }

  return {
    usersProcessed: users.length,
    challengesProcessed: challenges.length,
    solvesProcessed: processedSolves,
    droppedSolveRefs
  };
}

module.exports = recalculateScores;
