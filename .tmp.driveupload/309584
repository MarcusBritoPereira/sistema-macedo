import { Test, TestingModule } from '@nestjs/testing';
import { BankingIntegrationService } from './banking-integration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OfxService } from './ofx.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { CryptoService } from '../../shared/crypto.service';
import { BadRequestException } from '@nestjs/common';

describe('BankingIntegrationService - importCsv', () => {
  let service: BankingIntegrationService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      importacaoBancaria: {
        create: jest.fn().mockResolvedValue({ id: 'import-001' }),
      },
      extratoBancario: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'stmt-001' }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankingIntegrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OfxService, useValue: {} },
        { provide: ReconciliationService, useValue: {} },
        {
          provide: CryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BankingIntegrationService>(BankingIntegrationService);
    prisma = module.get(PrismaService);
  });

  it('should successfully parse a standard UTF-8 CSV with semicolons (Portuguese Excel format)', async () => {
    const csvContent =
      'Data;Descrição;Valor;Tipo\n' +
      '19/05/2026;PIX RECEBIDO JOAO;150,50;C\n' +
      '20/05/2026;PAGAMENTO ENERGIA;-320,00;D\n';

    const buffer = Buffer.from(csvContent, 'utf-8');
    const result = await service.importCsv(buffer, 'conta-01');

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.duplicates).toBe(0);

    expect(prisma.extratoBancario.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        data: new Date(Date.UTC(2026, 4, 19, 12, 0, 0)),
        descricao: 'PIX RECEBIDO JOAO',
        valor: 150.5,
        tipo: 'CREDIT',
        sourceType: 'CSV',
      }),
    });

    expect(prisma.extratoBancario.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        data: new Date(Date.UTC(2026, 4, 20, 12, 0, 0)),
        descricao: 'PAGAMENTO ENERGIA',
        valor: 320.0,
        tipo: 'DEBIT',
        sourceType: 'CSV',
      }),
    });
  });

  it('should decode ISO-8859-1 (Windows-1252) encoded file correctly', async () => {
    // Character 'ç' is 0xE7 in ISO-8859-1, 'ã' is 0xE3
    const csvContentBytes = Buffer.from([
      // Header: Data;Descrição;Valor\n
      0x44, 0x61, 0x74, 0x61, 0x3b, 0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7,
      0xe3, 0x6f, 0x3b, 0x56, 0x61, 0x6c, 0x6f, 0x72, 0x0a,
      // 19/05/2026;Transação Teste;-100,00\n
      0x31, 0x39, 0x2f, 0x30, 0x35, 0x2f, 0x32, 0x30, 0x32, 0x36, 0x3b, 0x54,
      0x72, 0x61, 0x6e, 0x73, 0x61, 0xe7, 0xe3, 0x6f, 0x20, 0x54, 0x65, 0x73,
      0x74, 0x65, 0x3b, 0x2d, 0x31, 0x30, 0x30, 0x2c, 0x30, 0x30, 0x0a,
    ]);

    const result = await service.importCsv(csvContentBytes, 'conta-01');
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);

    expect(prisma.extratoBancario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        descricao: 'Transação Teste',
        valor: 100.0,
        tipo: 'DEBIT',
      }),
    });
  });

  it('should detect headers dynamically with irregular leading rows and diverse Brazilian banks column names', async () => {
    const csvContent =
      'Extrato de Conta Corrente\n' +
      'Conta: 12345-6\n' +
      '\n' +
      'Data Movimento,Histórico/Descrição,Entrada/Saída (R$),Tipo\n' +
      '19/05/26,Transferencia Recebida,500.00,Credito\n' +
      '20/05/26,Tarifa Mensal,45.90-,Debito\n';

    const buffer = Buffer.from(csvContent, 'utf-8');
    const result = await service.importCsv(buffer, 'conta-01');

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);

    expect(prisma.extratoBancario.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        data: new Date(Date.UTC(2026, 4, 19, 12, 0, 0)),
        descricao: 'Transferencia Recebida',
        valor: 500.0,
        tipo: 'CREDIT',
      }),
    });

    expect(prisma.extratoBancario.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        data: new Date(Date.UTC(2026, 4, 20, 12, 0, 0)),
        descricao: 'Tarifa Mensal',
        valor: 45.9,
        tipo: 'DEBIT',
      }),
    });
  });

  it('should skip duplicate transactions correctly using unique hashes', async () => {
    const csvContent =
      'Data;Descrição;Valor;Tipo\n' + '19/05/2026;PIX RECEBIDO JOAO;150,50;C\n';

    // Simulate first one is new, second is duplicate
    (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValueOnce(
      null,
    );

    const buffer = Buffer.from(csvContent, 'utf-8');
    const result = await service.importCsv(buffer, 'conta-01');

    expect(result.imported).toBe(1);
    expect(result.duplicates).toBe(0);

    // Simulate duplicate check returns existing record
    (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'exists',
    });
    const resultDuplicate = await service.importCsv(buffer, 'conta-01');
    expect(resultDuplicate.imported).toBe(0);
    expect(resultDuplicate.duplicates).toBe(1);
  });

  it('should throw BadRequestException if no valid transactions are found', async () => {
    const csvContent = 'Header1,Header2,Header3\nRow1,Row2,Row3\n';
    const buffer = Buffer.from(csvContent, 'utf-8');

    await expect(service.importCsv(buffer, 'conta-01')).rejects.toThrow(
      BadRequestException,
    );
  });
});
