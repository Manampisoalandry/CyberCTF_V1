const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const unlockedHintsSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true
    },
    hints: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    ]
  },
  { _id: false }
);

const hintUnlockHistorySchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true
    },
    hint: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 40
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'participant'],
      default: 'participant'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: {
      type: Date,
      default: null
    },
    emailVerificationToken: {
      type: String,
      default: null
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    bio: {
      type: String,
      default: '',
      maxlength: 400
    },
    solvedChallenges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge'
      }
    ],
    unlockedHints: [unlockedHintsSchema],
    hintUnlockHistory: [hintUnlockHistorySchema],
    firstBloods: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
