const jwt = require('jsonwebtoken');
const User = require('./models/User');

let ioInstance = null;

function normalizeSocketToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return String(authToken).trim();

  const authHeader = socket.handshake?.headers?.authorization || '';
  const [scheme, token] = String(authHeader).split(' ');
  if (scheme === 'Bearer' && token) return token.trim();

  const queryToken = socket.handshake?.query?.token;
  if (queryToken) return String(queryToken).trim();

  return '';
}

function initRealtime(io) {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = normalizeSocketToken(socket);
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.sub).select('_id username role');
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user?._id?.toString();
    const role = user?.role || 'participant';

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.join(role === 'admin' ? 'admins' : 'participants');
    socket.join('authenticated');

    socket.emit('system:hello', {
      connectedAt: new Date().toISOString(),
      role
    });
  });
}

function emitToUser(userId, eventName, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${String(userId)}`).emit(eventName, payload);
}

function emitToAdmins(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('admins').emit(eventName, payload);
}

function emitToParticipants(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('participants').emit(eventName, payload);
}

function emitToAuthenticated(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('authenticated').emit(eventName, payload);
}

function emitSolveActivity(payload) {
  if (!ioInstance) return;
  ioInstance.to('participants').emit('activity:solve', payload);
  ioInstance.to('admins').emit('activity:solve', payload);
}

module.exports = {
  initRealtime,
  emitToUser,
  emitToAdmins,
  emitToParticipants,
  emitToAuthenticated,
  emitSolveActivity
};
