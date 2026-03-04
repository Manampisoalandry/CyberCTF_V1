const FIRST_BLOOD_BONUS = 80;
const SECOND_BLOOD_BONUS = 50;

function getSolveBonusByOrder(order) {
  if (order === 1) return FIRST_BLOOD_BONUS;
  if (order === 2) return SECOND_BLOOD_BONUS;
  return 0;
}

module.exports = {
  FIRST_BLOOD_BONUS,
  SECOND_BLOOD_BONUS,
  getSolveBonusByOrder
};
