const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    senderRole: {
      type: String,
      enum: ['participant', 'admin'],
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    // When admin replies, participant hasn't read yet.
    unreadForParticipant: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    messages: [ticketMessageSchema]
  },
  { timestamps: true }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
