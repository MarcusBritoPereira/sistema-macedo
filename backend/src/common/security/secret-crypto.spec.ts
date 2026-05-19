import { decryptSecret, encryptSecret } from './secret-crypto';

describe('secret-crypto', () => {
  beforeAll(() => {
    process.env.SECRETS_ENCRYPTION_KEY =
      'test-key-with-at-least-thirty-two-chars';
  });

  it('encrypts and decrypts with round-trip consistency', () => {
    const value = 'my-super-secret';
    const encrypted = encryptSecret(value);
    expect(encrypted).not.toBe(value);
    expect(decryptSecret(encrypted)).toBe(value);
  });
});
