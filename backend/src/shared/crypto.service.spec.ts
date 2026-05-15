import { CryptoService } from './crypto.service';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';

describe('CryptoService', () => {
  let service: CryptoService;
  const validKey = Buffer.from('x'.repeat(32)).toString('base64');

  beforeEach(async () => {
    process.env.ENCRYPTION_MASTER_KEY = validKey;
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();
    service = module.get<CryptoService>(CryptoService);
  });

  describe('when key is valid', () => {
    it('encrypts plain text and produces a non-readable cipher', () => {
      const plain = 'my-super-secret-api-key';
      const encrypted = service.encrypt(plain);
      expect(encrypted).not.toBe(plain);
      expect(encrypted).toContain(':');
    });

    it('round-trips encrypt/decrypt consistently', () => {
      const plain = 'client-secret-inter-banco';
      const encrypted = service.encrypt(plain);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    it('each encryption produces a different ciphertext (random IV)', () => {
      const plain = 'same-value';
      const enc1 = service.encrypt(plain);
      const enc2 = service.encrypt(plain);
      expect(enc1).not.toBe(enc2); // Different IV every time
    });

    it('decryption fails on tampered ciphertext', () => {
      const encrypted = service.encrypt('sensitive-data');
      const tampered = encrypted.slice(0, -4) + 'XXXX'; // Tamper last bytes
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('returns empty string as-is without encrypting', () => {
      expect(service.encrypt('')).toBe('');
      expect(service.decrypt('')).toBe('');
    });
  });

  describe('when key is missing', () => {
    it('throws InternalServerErrorException on missing ENCRYPTION_MASTER_KEY', () => {
      delete process.env.ENCRYPTION_MASTER_KEY;
      expect(() => new CryptoService()).toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException if key is wrong length', () => {
      process.env.ENCRYPTION_MASTER_KEY = Buffer.from('short-key').toString('base64');
      expect(() => new CryptoService()).toThrow(InternalServerErrorException);
    });
  });
});
