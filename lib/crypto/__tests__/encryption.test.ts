import { encryptApiKey, decryptApiKey, isEncrypted } from '../encryption';

// 32-byte key in hex (64 chars)
const TEST_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

beforeEach(() => {
 process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
 delete process.env.ENCRYPTION_KEY;
});

describe('isEncrypted', () => {
 it('returns true for encrypted values', () => {
 expect(isEncrypted('enc:v1:aabb:ccdd:eeff')).toBe(true);
 });

 it('returns false for plaintext', () => {
 expect(isEncrypted('sk-abc123')).toBe(false);
 });

 it('returns false for null/undefined', () => {
 expect(isEncrypted(null)).toBe(false);
 expect(isEncrypted(undefined)).toBe(false);
 });
});

describe('encryptApiKey', () => {
 it('encrypts a plaintext key', () => {
 const encrypted = encryptApiKey('sk-test-key-12345');
 expect(encrypted).not.toBeNull();
 expect(encrypted!.startsWith('enc:v1:')).toBe(true);
 // Format: enc:v1:<iv>:<authTag>:<ciphertext>
 const parts = encrypted!.slice(7).split(':');
 expect(parts).toHaveLength(3);
 });

 it('returns null for null/undefined/empty', () => {
 expect(encryptApiKey(null)).toBeNull();
 expect(encryptApiKey(undefined)).toBeNull();
 expect(encryptApiKey('')).toBeNull();
 expect(encryptApiKey(' ')).toBeNull();
 });

 it('returns already-encrypted value as-is', () => {
 const encrypted = encryptApiKey('sk-test-key');
 const doubleEncrypted = encryptApiKey(encrypted);
 expect(doubleEncrypted).toBe(encrypted);
 });

 it('produces different ciphertexts for same input (random IV)', () => {
 const a = encryptApiKey('same-key');
 const b = encryptApiKey('same-key');
 expect(a).not.toBe(b);
 });

 it('throws if ENCRYPTION_KEY is missing', () => {
 delete process.env.ENCRYPTION_KEY;
 expect(() => encryptApiKey('sk-test')).toThrow('ENCRYPTION_KEY environment variable is not set');
 });

 it('throws if ENCRYPTION_KEY has wrong length', () => {
 process.env.ENCRYPTION_KEY = 'tooshort';
 expect(() => encryptApiKey('sk-test')).toThrow('64-character hex string');
 });
});

describe('decryptApiKey', () => {
 it('round-trips encrypt then decrypt', () => {
 const original = 'sk-very-secret-api-key-12345';
 const encrypted = encryptApiKey(original)!;
 const decrypted = decryptApiKey(encrypted);
 expect(decrypted).toBe(original);
 });

 it('returns empty string for null/undefined/empty', () => {
 expect(decryptApiKey(null)).toBe('');
 expect(decryptApiKey(undefined)).toBe('');
 expect(decryptApiKey('')).toBe('');
 });

 it('returns plaintext as-is (backwards compatible)', () => {
 expect(decryptApiKey('sk-plaintext-legacy')).toBe('sk-plaintext-legacy');
 });

 it('handles unicode characters', () => {
 const original = 'key-with-unicóde-çàráctèrs';
 const encrypted = encryptApiKey(original)!;
 expect(decryptApiKey(encrypted)).toBe(original);
 });

 it('returns empty string on tampered ciphertext (safe, no throw)', () => {
 const encrypted = encryptApiKey('sk-test')!;
 const tampered = encrypted.slice(0, -4) + 'ffff';
 expect(decryptApiKey(tampered)).toBe('');
 });

 it('returns empty string with wrong key (safe, no throw)', () => {
 const encrypted = encryptApiKey('sk-test')!;
 process.env.ENCRYPTION_KEY = 'b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
 expect(decryptApiKey(encrypted)).toBe('');
 });

 it('returns empty string when ENCRYPTION_KEY missing (safe, no throw)', () => {
 const encrypted = encryptApiKey('sk-test')!;
 delete process.env.ENCRYPTION_KEY;
 expect(decryptApiKey(encrypted)).toBe('');
 });
});
