import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, generateEncryptionKey } from '../../../lib/utils-crypto';

// The encryption key is set in tests/setup.ts
const VALID_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY!;

describe('utils-crypto', () => {
  describe('encrypt / decrypt', () => {
    it('B15.1 - encrypt then decrypt returns original text', () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('B15.2 - Hebrew text round-trip', () => {
      const original = 'שלום עולם - טקסט בעברית';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('B15.3 - JSON credentials round-trip', () => {
      const credentials = JSON.stringify({ username: 'user', password: 'p@$$w0rd!', token: '12345' });
      expect(decrypt(encrypt(credentials))).toBe(credentials);
    });

    it('B15.4 - missing CREDENTIALS_ENCRYPTION_KEY throws', () => {
      const saved = process.env.CREDENTIALS_ENCRYPTION_KEY;
      delete process.env.CREDENTIALS_ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('CREDENTIALS_ENCRYPTION_KEY environment variable is not set');
      process.env.CREDENTIALS_ENCRYPTION_KEY = saved;
    });

    it('B15.5 - invalid encrypted format throws', () => {
      expect(() => decrypt('no-colon-at-all')).toThrow('Invalid encrypted text format');
    });

    it('B15.5b - empty encrypted part throws', () => {
      expect(() => decrypt('abc:')).toThrow('Invalid encrypted text format');
    });

    it('B15.6 - each encrypt produces different ciphertext (random IV)', () => {
      const enc1 = encrypt('same text');
      const enc2 = encrypt('same text');
      expect(enc1).not.toBe(enc2);
      const [iv1] = enc1.split(':');
      const [iv2] = enc2.split(':');
      expect(iv1).not.toBe(iv2);
    });
  });

  describe('generateEncryptionKey', () => {
    it('generates 64-character hex string (32 bytes)', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('generates different key each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });
});
