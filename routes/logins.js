const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const { encrypt, decrypt } = require('../crypto-utils');
const auth     = require('../middleware/auth');

router.use(auth);

function decryptRow(key, row) {
  return {
    id:           row.id,
    website_name: row.website_name,
    website_url:  row.website_url,
    category:     row.category,
    username:     decrypt(key, row.username),
    password:     decrypt(key, row.password),
    notes:        decrypt(key, row.notes),
    created_at:   row.created_at,
    updated_at:   row.updated_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM login_credentials ORDER BY website_name COLLATE NOCASE').all();
  res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM login_credentials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(decryptRow(req.encryptionKey, row));
});

router.post('/', (req, res) => {
  const { website_name, website_url, category, username, password, notes } = req.body;
  if (!website_name || !username || !password) {
    return res.status(400).json({ error: 'website_name, username, and password are required' });
  }
  const k = req.encryptionKey;
  const result = db.prepare(`
    INSERT INTO login_credentials (website_name, website_url, category, username, password, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(website_name, website_url || null, category || 'general',
         encrypt(k, username), encrypt(k, password), notes ? encrypt(k, notes) : null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM login_credentials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { website_name, website_url, category, username, password, notes } = req.body;
  const k = req.encryptionKey;
  db.prepare(`
    UPDATE login_credentials
    SET website_name=?, website_url=?, category=?, username=?, password=?, notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(website_name, website_url || null, category || 'general',
         encrypt(k, username), encrypt(k, password), notes ? encrypt(k, notes) : null,
         req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM login_credentials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM login_credentials WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
