require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const recalculateScores = require('../utils/recalculateScores');

async function run() {
  await connectDB();
  const summary = await recalculateScores();
  console.log('Score migration completed:', summary);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Score migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
