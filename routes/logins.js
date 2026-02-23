const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');
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

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM login_credentials ORDER BY LOWER(website_name)'
    );
    res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM login_credentials WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(decryptRow(req.encryptionKey, rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { website_name, website_url, category, username, password, notes } = req.body;
  if (!website_name || !username || !password) {
    return res.status(400).json({ error: 'website_name, username, and password are required' });
  }
  const k = req.encryptionKey;
  try {
    const { rows } = await pool.query(
      `INSERT INTO login_credentials (website_name, website_url, category, username, password, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [website_name, website_url || null, category || 'general',
       encrypt(k, username), encrypt(k, password), notes ? encrypt(k, notes) : null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { website_name, website_url, category, username, password, notes } = req.body;
  const k = req.encryptionKey;
  try {
    const check = await pool.query(
      'SELECT id FROM login_credentials WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `UPDATE login_credentials
       SET website_name=$1, website_url=$2, category=$3, username=$4, password=$5, notes=$6, updated_at=CURRENT_TIMESTAMP
       WHERE id=$7`,
      [website_name, website_url || null, category || 'general',
       encrypt(k, username), encrypt(k, password), notes ? encrypt(k, notes) : null,
       req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT id FROM login_credentials WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM login_credentials WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
