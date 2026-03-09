/**
 * Application-layer encryption for sensitive data (API keys).
 *
 * Uses AES-256-GCM via Node.js `crypto` module.
 * Encrypted format:"enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>"
 *
 * The ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
 const keyHex = process.env.ENCRYPTION_KEY;
 if (!keyHex) {
 throw new Error('ENCRYPTION_KEY environment variable is not set');
 }
 if (keyHex.length !== 64) {
 throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
 }
 return Buffer.from(keyHex, 'hex');
}

/**
 * Check if a value is already encrypted (has the enc:v1: prefix).
 */
export function isEncrypted(value: string | null | undefined): boolean {
 return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext API key.
 * Returns the encrypted string in format:"enc:v1:<iv>:<authTag>:<ciphertext>"
 * Returns null if input is null/undefined/empty.
 */
export function encryptApiKey(plaintext: string | null | undefined): string | null {
 if (!plaintext || plaintext.trim().length === 0) return null;

 // Already encrypted — return as-is
 if (isEncrypted(plaintext)) return plaintext;

 const key = getEncryptionKey();
 const iv = randomBytes(IV_LENGTH);
 const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

 const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
 const authTag = cipher.getAuthTag();

 return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an encrypted API key (safe — never throws).
 * If the value is not encrypted (no prefix), returns it as-is (backwards compatible).
 * On decryption failure (wrong key, corrupt data), returns empty string and logs warning.
 * Returns empty string if input is null/undefined/empty.
 */
export function decryptApiKey(encrypted: string | null | undefined): string {
 if (!encrypted || encrypted.trim().length === 0) return '';

 // Not encrypted (plaintext legacy value) — return as-is
 if (!isEncrypted(encrypted)) return encrypted;

 try {
 const key = getEncryptionKey();
 const parts = encrypted.slice(PREFIX.length).split(':');

 if (parts.length !== 3) {
 console.error('[encryption] Invalid encrypted format — expected 3 parts after prefix');
 return '';
 }

 const [ivHex, authTagHex, ciphertextHex] = parts;
 const iv = Buffer.from(ivHex, 'hex');
 const authTag = Buffer.from(authTagHex, 'hex');
 const ciphertext = Buffer.from(ciphertextHex, 'hex');

 const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
 decipher.setAuthTag(authTag);

 const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
 return decrypted.toString('utf8');
 } catch (error) {
 console.error('[encryption] Failed to decrypt API key — wrong ENCRYPTION_KEY or corrupt data:', error instanceof Error ? error.message : error);
 return '';
 }
}
