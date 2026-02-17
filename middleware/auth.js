const jwt          = require('jsonwebtoken');
const sessionStore = require('../session-store');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const key = sessionStore.get(payload.sessionId);
    if (!key) {
      return res.status(401).json({ error: 'Session expired — please unlock again' });
    }
    req.sessionId     = payload.sessionId;
    req.encryptionKey = key;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
