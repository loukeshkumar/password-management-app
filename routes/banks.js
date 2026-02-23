const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');
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

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM bank_accounts ORDER BY LOWER(bank_name)'
    );
    res.json(rows.map(r => decryptRow(req.encryptionKey, r)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(decryptRow(req.encryptionKey, rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password } = req.body;
  if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
    return res.status(400).json({ error: 'bank_name, account_holder_name, account_number, and ifsc_code are required' });
  }
  const k = req.encryptionKey;
  try {
    const { rows } = await pool.query(
      `INSERT INTO bank_accounts (bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [bank_name, branch_name || null, account_type || 'savings',
       encrypt(k, account_holder_name), encrypt(k, account_number), encrypt(k, ifsc_code),
       net_banking_username ? encrypt(k, net_banking_username) : null,
       net_banking_password ? encrypt(k, net_banking_password) : null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { bank_name, branch_name, account_type, account_holder_name, account_number, ifsc_code, net_banking_username, net_banking_password } = req.body;
  const k = req.encryptionKey;
  try {
    const check = await pool.query(
      'SELECT id FROM bank_accounts WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `UPDATE bank_accounts
       SET bank_name=$1, branch_name=$2, account_type=$3, account_holder_name=$4, account_number=$5, ifsc_code=$6, net_banking_username=$7, net_banking_password=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9`,
      [bank_name, branch_name || null, account_type || 'savings',
       encrypt(k, account_holder_name), encrypt(k, account_number), encrypt(k, ifsc_code),
       net_banking_username ? encrypt(k, net_banking_username) : null,
       net_banking_password ? encrypt(k, net_banking_password) : null,
       req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT id FROM bank_accounts WHERE id = $1', [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM bank_accounts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
