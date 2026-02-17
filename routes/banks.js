const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const { encrypt, decrypt } = require('../crypto-utils');
const auth     = require('../middleware/auth');

router.use(auth);

function decryptRow(key, row) {
  return {
    id:                   row.id,
    bank_name:            row.bank_name,
    branch_name:          row.branch_name,
    account_type:         row.account_type,
    account_holder_name:  decrypt(key, row.account_holder_name),
    account_number:       decrypt(key, row.account_number),
    ifsc_code:            decrypt(key, row.ifsc_code),
    net_banking_username: decrypt(key, row.net_banking_username),
    net_banking_password: decrypt(key, row.net_banking_password),
    created_at:           row.created_at,
    updated_at:           row.updated_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM bank_accounts ORDER BY bank_name COLLATE NOCASE').all();
  res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(decryptRow(req.encryptionKey, row));
});

router.post('/', (req, res) => {
  const { bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password } = req.body;
  if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
    return res.status(400).json({ error: 'bank_name, account_holder_name, account_number, and ifsc_code are required' });
  }
  const k = req.encryptionKey;
  const result = db.prepare(`
    INSERT INTO bank_accounts (bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bank_name, branch_name || null, account_type || 'savings',
         encrypt(k, account_holder_name), encrypt(k, account_number), encrypt(k, ifsc_code),
         net_banking_username ? encrypt(k, net_banking_username) : null,
         net_banking_password ? encrypt(k, net_banking_password) : null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password } = req.body;
  const k = req.encryptionKey;
  db.prepare(`
    UPDATE bank_accounts
    SET bank_name=?, branch_name=?, account_type=?, account_holder_name=?, account_number=?, ifsc_code=?, net_banking_username=?, net_banking_password=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(bank_name, branch_name || null, account_type || 'savings',
         encrypt(k, account_holder_name), encrypt(k, account_number), encrypt(k, ifsc_code),
         net_banking_username ? encrypt(k, net_banking_username) : null,
         net_banking_password ? encrypt(k, net_banking_password) : null,
         req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
