import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isMaskedSecret,
} from '../../src/common/utils/secret-crypto';

describe('secret-crypto', () => {
  it('encrypts and decrypts secrets without exposing the raw value', () => {
    const encrypted = encryptSecret('smtp-password');

    expect(encrypted).toMatch(/^enc:/);
    expect(encrypted).not.toContain('smtp-password');
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(decryptSecret(encrypted)).toBe('smtp-password');
  });

  it('preserves already encrypted values', () => {
    const encrypted = encryptSecret('imap-password');

    expect(encryptSecret(encrypted)).toBe(encrypted);
  });

  it('handles masked and malformed secrets safely', () => {
    expect(isMaskedSecret('••••••••')).toBe(true);
    expect(isEncryptedSecret('plain-text')).toBe(false);
    expect(decryptSecret('enc:invalid-payload')).toBe('');
  });
});
