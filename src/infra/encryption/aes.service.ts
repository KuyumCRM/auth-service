// AES-256-GCM for IG token encryption at rest.
import * as crypto from 'crypto';
import type { IEncryption } from '../../shared/interfaces/IEncryption.js';
import { env } from '../../config/env.js';
import { AES_ALGORITHM, AES_IV_LENGTH, AES_TAG_LENGTH, AES_KEY_LENGTH } from '../../config/constants.js';

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY_B64, 'base64');
  if (key.length !== AES_KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY_B64 must decode to 32 bytes');
  }
  return key;
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = getKey();
  const iv = crypto.randomBytes(AES_IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, { authTagLength: AES_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decrypt(ciphertext: string, ivBase64: string): string {
  const key = getKey();
  const iv = Buffer.from(ivBase64, 'base64');
  if (iv.length !== AES_IV_LENGTH) throw new Error('Invalid IV length');
  const buf = Buffer.from(ciphertext, 'base64');
  const tag = buf.subarray(-AES_TAG_LENGTH);
  const data = buf.subarray(0, -AES_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv, { authTagLength: AES_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
}

export function createEncryption(): IEncryption {
  return { encrypt, decrypt };
}
