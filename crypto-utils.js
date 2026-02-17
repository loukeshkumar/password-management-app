const crypto = require('crypto');

const ALGORITHM     = 'aes-256-gcm';
const KDF_ITERATIONS = 100000;
const KDF_KEYLEN    = 32;
const KDF_DIGEST    = 'sha512';

/**
 * Derive a 256-bit encryption key from the master password using PBKDF2.
 * The salt is stored in the DB (not secret) so the key can be re-derived
 * on each login without storing the key itself.
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KDF_KEYLEN, KDF_DIGEST);
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all hex-encoded).
 */
function encrypt(key, plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value produced by encrypt().
 */
function decrypt(key, ciphertext) {
  if (!ciphertext) return null;
  const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
  const iv      = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const data    = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

module.exports = { deriveKey, generateSalt, encrypt, decrypt };
