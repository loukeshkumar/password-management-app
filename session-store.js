/**
 * In-memory map of sessionId → Buffer(encryptionKey).
 * Keys are never written to disk; the vault is locked when the process restarts.
 */
const sessions = new Map();

module.exports = {
  set(sessionId, encryptionKey) {
    sessions.set(sessionId, encryptionKey);
  },
  get(sessionId) {
    return sessions.get(sessionId);
  },
  delete(sessionId) {
    sessions.delete(sessionId);
  },
};
