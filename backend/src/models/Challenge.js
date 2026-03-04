const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    url: { type: String, required: true },
    pathOnDisk: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const solveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    solveOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    bonusAwarded: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: true }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    options: [
      {
        type: String,
        trim: true,
        maxlength: 200
      }
    ],
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    }
  },
  { _id: true }
);

const hintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000
    },
    isFree: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Insane'],
      default: 'Easy'
    },
    flag: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: 1
    },
    quizQuestion: {
      type: String,
      default: '',
      maxlength: 300
    },
    quizOptions: [{
      type: String,
      trim: true,
      maxlength: 200
    }],
    quizQuestions: [quizQuestionSchema],
    // Optional hint system
    hints: [hintSchema],
    files: [fileSchema],
    isSuspendedUntilPrerequisite: {
      type: Boolean,
      default: false
    },
    prerequisiteChallenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      default: null
    },
    firstBloodUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    solves: [solveSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

challengeSchema.pre('save', function syncChallengeFields(next) {
  this.quizQuestion = String(this.quizQuestion || '').trim();
  this.quizOptions = Array.isArray(this.quizOptions)
    ? this.quizOptions.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
    : [];

  const isOsint = String(this.type || '').trim().toLowerCase() === 'osint';

  const sanitizedQuizQuestions = Array.isArray(this.quizQuestions)
    ? this.quizQuestions
        .map((item) => {
          const question = String(item?.question || '').trim();
          const options = Array.isArray(item?.options)
            ? item.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 6)
            : [];
          const correctAnswer = String(item?.correctAnswer || '').trim();

          if (!question || options.length < 2 || !correctAnswer || !options.includes(correctAnswer)) {
            return null;
          }

          return {
            question,
            options,
            correctAnswer
          };
        })
        .filter(Boolean)
        .slice(0, 10)
    : [];

  this.quizQuestions = isOsint ? sanitizedQuizQuestions : [];

  // Sanitize hints (optional for any type)
  const sanitizedHints = Array.isArray(this.hints)
    ? this.hints
        .map((item) => {
          const title = String(item?.title || '').trim();
          const content = String(item?.content || '').trim();
          const costValue = Number(item?.cost);
          const cost = Number.isFinite(costValue) ? Math.max(0, Math.min(10000, costValue)) : 0;
          if (!content) return null;
          return {
            title,
            content,
            cost,
            isFree: cost === 0
          };
        })
        .filter(Boolean)
        .slice(0, 20)
    : [];

  this.hints = sanitizedHints;

  if (this.quizQuestions.length) {
    this.flag = '__QUIZ__';
  } else {
    this.flag = String(this.flag || '').trim();
  }

  if (!this.isSuspendedUntilPrerequisite) {
    this.prerequisiteChallenge = null;
  }

  if (this.isSuspendedUntilPrerequisite && !this.prerequisiteChallenge) {
    this.isSuspendedUntilPrerequisite = false;
  }

  next();
});

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;
