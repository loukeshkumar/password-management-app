const express  = require('express');
const router   = express.Router();
const db       = require('../db');
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

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM card_details ORDER BY bank_name COLLATE NOCASE').all();
  res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM card_details WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(decryptRow(req.encryptionKey, row));
});

router.post('/', (req, res) => {
  const { bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin } = req.body;
  if (!card_holder_name || !card_number || !expiry_date || !cvv || !pin) {
    return res.status(400).json({ error: 'card_holder_name, card_number, expiry_date, cvv, and pin are required' });
  }
  const k = req.encryptionKey;
  const result = db.prepare(`
    INSERT INTO card_details (bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bank_name || null, card_network || null, card_type || 'debit',
         encrypt(k, card_holder_name), encrypt(k, card_number),
         encrypt(k, expiry_date), encrypt(k, cvv), encrypt(k, pin));
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM card_details WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { bank_name, card_network, card_type, card_holder_name, card_number, expiry_date, cvv, pin } = req.body;
  const k = req.encryptionKey;
  db.prepare(`
    UPDATE card_details
    SET bank_name=?, card_network=?, card_type=?, card_holder_name=?, card_number=?, expiry_date=?, cvv=?, pin=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(bank_name || null, card_network || null, card_type || 'debit',
         encrypt(k, card_holder_name), encrypt(k, card_number),
         encrypt(k, expiry_date), encrypt(k, cvv), encrypt(k, pin),
         req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM card_details WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM card_details WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
