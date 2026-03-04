const express = require('express');
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const { emitToAdmins } = require('../realtime');

const router = express.Router();

router.use(requireAuth);

router.get('/unread-count', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.json({ unread: 0 });
    }

    const tickets = await Ticket.find({ createdBy: req.user._id }).select('messages');
    const unread = tickets.reduce((acc, ticket) => {
      const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      return acc + messages.filter((m) => m.senderRole === 'admin' && m.unreadForParticipant).length;
    }, 0);

    return res.json({ unread });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can view this resource.' });
    }

    const tickets = await Ticket.find({ createdBy: req.user._id })
      .sort({ updatedAt: -1 });

    return res.json({
      tickets
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can create tickets.' });
    }

    const subject = String(req.body.subject || '').trim();
    const content = String(req.body.content || '').trim();

    if (!subject || !content) {
      return res.status(400).json({ message: 'subject and content are required.' });
    }

    const ticket = await Ticket.create({
      createdBy: req.user._id,
      subject,
      status: 'open',
      messages: [
        {
          senderRole: 'participant',
          sender: req.user._id,
          content,
          unreadForParticipant: false
        }
      ]
    });

    emitToAdmins('ticket:new', {
      id: `ticket:new:${ticket._id.toString()}:${Date.now()}`,
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      participantId: req.user._id.toString(),
      participantName: req.user.username,
      preview: content.slice(0, 140),
      status: ticket.status,
      createdAt: ticket.createdAt
    });

    return res.status(201).json({
      message: 'Ticket created.',
      ticket
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:ticketId/reply', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can reply here.' });
    }

    const ticket = await Ticket.findOne({ _id: req.params.ticketId, createdBy: req.user._id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: 'content is required.' });
    }

    ticket.messages.push({
      senderRole: 'participant',
      sender: req.user._id,
      content,
      unreadForParticipant: false
    });

    await ticket.save();

    emitToAdmins('ticket:participant-reply', {
      id: `ticket:participant-reply:${ticket._id.toString()}:${Date.now()}`,
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      participantId: req.user._id.toString(),
      participantName: req.user.username,
      preview: content.slice(0, 140),
      status: ticket.status,
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Reply sent.', ticket });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:ticketId/mark-read', async (req, res, next) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can mark tickets as read.' });
    }

    const ticket = await Ticket.findOne({ _id: req.params.ticketId, createdBy: req.user._id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    (ticket.messages || []).forEach((m) => {
      if (m.senderRole === 'admin') m.unreadForParticipant = false;
    });

    await ticket.save();
    return res.json({ message: 'Marked as read.', ticket });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
