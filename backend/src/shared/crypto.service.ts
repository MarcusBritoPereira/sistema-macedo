import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly _key: Buffer; // Master key

  constructor() {
    const keyEnv = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyEnv) {
      throw new InternalServerErrorException('ENCRYPTION_MASTER_KEY is not defined in environment variables');
    }
    this._key = Buffer.from(keyEnv, 'base64');
    if (this._key.length !== 32) {
      throw new InternalServerErrorException('ENCRYPTION_MASTER_KEY must be a 32-byte key encrypted in base64');
    }
  }

  encrypt(plainText: string): string {
    if (!plainText) return plainText;
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this._key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return cipherText;

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this._key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
