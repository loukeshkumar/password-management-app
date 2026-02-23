const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');
const { encrypt, decrypt } = require('../crypto-utils');
const auth     = require('../middleware/auth');

router.use(auth);

function decryptRow(key, row) {
  return {
    id:               row.id,
    bank_name:        row.bank_name,
    card_network:     row.card_network,
    card_type:        row.card_type,
    card_holder_name: decrypt(key, row.card_holder_name),
    card_number:      decrypt(key, row.card_number),
    expiry_date:      decrypt(key, row.expiry_date),
    cvv:              decrypt(key, row.cvv),
    pin:              decrypt(key, row.pin),
    created_at:       row.created_at,
    updated_at:       row.updated_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM card_details ORDER BY LOWER(bank_name)'
    );
    res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM card_details WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(decryptRow(req.encryptionKey, rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin } = req.body;
  if (!card_holder_name || !card_number || !expiry_date || !cvv || !pin) {
    return res.status(400).json({ error: 'card_holder_name, card_number, expiry_date, cvv, and pin are required' });
  }
  const k = req.encryptionKey;
  try {
    const { rows } = await pool.query(
      `INSERT INTO card_details (bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [bank_name || null, card_network || null, card_type || 'debit',
       encrypt(k, card_holder_name), encrypt(k, card_number),
       encrypt(k, expiry_date), encrypt(k, cvv), encrypt(k, pin)]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin } = req.body;
  const k = req.encryptionKey;
  try {
    const check = await pool.query(
      'SELECT id FROM card_details WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `UPDATE card_details
       SET bank_name=$1, card_network=$2, card_type=$3, card_holder_name=$4, card_number=$5, expiry_date=$6, cvv=$7, pin=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9`,
      [bank_name || null, card_network || null, card_type || 'debit',
       encrypt(k, card_holder_name), encrypt(k, card_number),
       encrypt(k, expiry_date), encrypt(k, cvv), encrypt(k, pin),
       req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT id FROM card_details WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM card_details WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
