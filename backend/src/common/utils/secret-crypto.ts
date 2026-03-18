import crypto from 'crypto';
import { config } from '../../config';

const ENCRYPTED_PREFIX = 'enc:';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = config.settings.encryptionKey;
  return crypto.createHash('sha256').update(secret).digest();
}

export function isEncryptedSecret(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

export function isMaskedSecret(value?: string | null): boolean {
  return value === '••••••••';
}

export function encryptSecret(value?: string | null): string {
  if (!value) return '';
  if (isEncryptedSecret(value)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value?: string | null): string {
  if (!value) return '';
  if (!isEncryptedSecret(value)) return value;

  const encodedPayload = value.slice(ENCRYPTED_PREFIX.length);
  const [iv, authTag, encrypted] = encodedPayload.split(':');

  if (!iv || !authTag || !encrypted) {
    return '';
  }

  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}
