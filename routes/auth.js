const express      = require('express');
const router       = express.Router();
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');
const crypto       = require('crypto');
const db           = require('../db');
const { deriveKey, generateSalt } = require('../crypto-utils');
const sessionStore = require('../session-store');
const authMiddleware = require('../middleware/auth');

// Returns whether a master password has been configured
router.get('/status', (_req, res) => {
  const row = db.prepare('SELECT id FROM master_config WHERE id = 1').get();
  res.json({ isSetup: !!row });
});

// First-time setup — store bcrypt hash + KDF salt
router.post('/setup', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Master password must be at least 8 characters' });
  }
  if (db.prepare('SELECT id FROM master_config WHERE id = 1').get()) {
    return res.status(400).json({ error: 'Master password is already configured' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const kdfSalt      = generateSalt();
  db.prepare('INSERT INTO master_config (id, password_hash, kdf_salt) VALUES (1, ?, ?)').run(passwordHash, kdfSalt);
  res.json({ message: 'Vault created successfully' });
});

// Unlock the vault — returns a JWT containing the session ID
router.post('/unlock', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });

  const config = db.prepare('SELECT * FROM master_config WHERE id = 1').get();
  if (!config) return res.status(400).json({ error: 'Vault not initialised — please set up first' });

  const valid = await bcrypt.compare(password, config.password_hash);
  if (!valid) return res.status(401).json({ error: 'Incorrect master password' });

  const encryptionKey = deriveKey(password, config.kdf_salt);
  const sessionId     = crypto.randomBytes(32).toString('hex');
  sessionStore.set(sessionId, encryptionKey);

  const token = jwt.sign({ sessionId }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Lock the vault (delete the in-memory key)
router.post('/logout', authMiddleware, (req, res) => {
  sessionStore.delete(req.sessionId);
  res.json({ message: 'Vault locked' });
});

module.exports = router;
