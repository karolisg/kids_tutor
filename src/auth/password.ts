import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 32;

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(secret, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const saltPart = parts[1];
  const keyPart = parts[2];
  if (!saltPart || !keyPart) return false;
  const salt = Buffer.from(saltPart, 'base64url');
  const expected = Buffer.from(keyPart, 'base64url');
  if (salt.length === 0 || expected.length === 0) return false;
  const key = (await scryptAsync(secret, salt, expected.length)) as Buffer;
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}
