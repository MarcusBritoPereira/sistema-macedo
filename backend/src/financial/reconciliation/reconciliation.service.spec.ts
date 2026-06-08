import { ReconciliationService } from './reconciliation.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReconciliationService - Business Logic', () => {
  let service: ReconciliationService;
  let prisma: jest.Mocked<PrismaService>;
  let auditLog: jest.Mocked<AuditLogService>;

  const mockStatement = {
    id: 'stmt-001',
    descricao: 'PIX Empresa ABC CNPJ 11222333000101',
    valor: 1500,
    data: new Date('2024-01-15'),
    tipo: 'CREDIT',
    conciliado: false,
    importacao: { contaBancariaId: 'conta-01' },
    hash: 'INTER-2024-01-15-x',
    fitid: null,
    sourceType: 'CSV' as any,
    balance: null,
    matchConfidence: null,
    currency: 'BRL',
    importedAt: new Date(),
    importacaoId: null,
    conciliacoes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLancamento = {
    id: 'lanc-001',
    descricao: 'Recebimento ABC',
    valor: 1500,
    tipo: 'RECEITA' as any,
    status: 'PREVISTO' as any,
    dataVencimento: new Date('2024-01-14'),
    dataPagamento: null,
    dataCompetencia: null,
    observacoes: null,
    urlComprovante: null,
    contaBancariaId: null,
    categoriaId: null,
    centroCustoId: null,
    contratoId: null,
    clienteId: null,
    fornecedorId: null,
    fornecedorNome: null,
    recurrenciaId: null,
    recorrente: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      extratoBancario: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      lancamentoFinanceiro: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conciliacaoBancaria: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      cliente: { findMany: jest.fn().mockResolvedValue([]) },
      fornecedor: { findMany: jest.fn().mockResolvedValue([]) },
      obra: { count: jest.fn() },
      centroCusto: { count: jest.fn() },
      categoriaFinanceira: { count: jest.fn() },
      rateioLancamento: { createMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: AuditLogService,
          useValue: { createLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prisma = module.get(PrismaService);
    auditLog = module.get(AuditLogService);
  });

  describe('findSuggestedMatches', () => {
    it('throws NotFoundException when extrato does not exist', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.findSuggestedMatches('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns matching lancamentos by valor and date window', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prisma.lancamentoFinanceiro.findMany as jest.Mock).mockResolvedValue([
        mockLancamento,
      ]);

      const result = await service.findSuggestedMatches('stmt-001');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lanc-001');
    });
  });

  describe('linkManual', () => {
    it('throws NotFoundException if statement does not exist', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.lancamentoFinanceiro.findUnique as jest.Mock).mockResolvedValue(
        mockLancamento,
      );

      await expect(
        service.linkManual('non-exist', 'lanc-001', true, 'user-01'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if confirmacaoManual is false', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prisma.lancamentoFinanceiro.findUnique as jest.Mock).mockResolvedValue(
        mockLancamento,
      );

      await expect(
        service.linkManual('stmt-001', 'lanc-001', false, 'user-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if statement is already conciliated', async () => {
      const alreadyConciliado = { ...mockStatement, conciliado: true };
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        alreadyConciliado,
      );
      (prisma.lancamentoFinanceiro.findUnique as jest.Mock).mockResolvedValue(
        mockLancamento,
      );

      await expect(
        service.linkManual('stmt-001', 'lanc-001', true, 'user-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets lancamento status to CONCILIADO on success', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prisma.lancamentoFinanceiro.findUnique as jest.Mock).mockResolvedValue(
        mockLancamento,
      );
      (prisma.conciliacaoBancaria.create as jest.Mock).mockResolvedValue({
        id: 'conc-001',
      });
      (prisma.extratoBancario.update as jest.Mock).mockResolvedValue({});
      (prisma.lancamentoFinanceiro.update as jest.Mock).mockResolvedValue({});

      const result = await service.linkManual(
        'stmt-001',
        'lanc-001',
        true,
        'user-01',
      );
      expect(result).toEqual({ success: true });

      expect(prisma.lancamentoFinanceiro.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONCILIADO' }),
        }),
      );
    });
  });

  describe('unlink', () => {
    it('throws NotFoundException for non-existent conciliacao', async () => {
      (prisma.conciliacaoBancaria.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.unlink('non-existent', 'user-01')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reverts lancamento to REALIZADO on unlink', async () => {
      const mockLink = {
        id: 'conc-01',
        extratoBancarioId: 'stmt-001',
        lancamentoFinanceiroId: 'lanc-001',
      };
      (prisma.conciliacaoBancaria.findUnique as jest.Mock).mockResolvedValue(
        mockLink,
      );
      (prisma.conciliacaoBancaria.delete as jest.Mock).mockResolvedValue({});
      (prisma.extratoBancario.update as jest.Mock).mockResolvedValue({});
      (prisma.lancamentoFinanceiro.update as jest.Mock).mockResolvedValue({});

      const result = await service.unlink('conc-01', 'user-01');
      expect(result).toEqual({ success: true });

      expect(prisma.lancamentoFinanceiro.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lanc-001' },
          data: { status: 'REALIZADO' },
        }),
      );
    });
  });

  describe('createAndLink with destination allocations', () => {
    const baseData = {
      descricao: 'Compra rateada',
      clienteId: 'cliente-01',
      categoriaId: 'cat-01',
      centroCustoId: 'cc-01',
      tipoLancamento: 'OBRA',
      tipoCusto: 'MATERIAL',
      rateios: [
        {
          valor: 900,
          categoria: 'OUTROS',
          categoriaFinanceiraId: 'cat-01',
          tipoDestino: 'OBRA',
          obraId: 'obra-01',
          tipoCusto: 'MATERIAL',
          categoriaCusto: 'Cimento',
        },
        {
          valor: 600,
          categoria: 'OUTROS',
          categoriaFinanceiraId: 'cat-02',
          tipoDestino: 'CENTRO_CUSTO',
          centroCustoId: 'deposito-01',
          tipoCusto: 'MATERIAL',
          categoriaCusto: 'Ferragens',
        },
      ],
    };

    it('creates the launch and all allocations atomically', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prisma.obra.count as jest.Mock).mockResolvedValue(1);
      (prisma.centroCusto.count as jest.Mock).mockResolvedValue(1);
      (prisma.categoriaFinanceira.count as jest.Mock).mockResolvedValue(2);
      (prisma.lancamentoFinanceiro.create as jest.Mock).mockResolvedValue({
        id: 'lanc-rateado',
      });
      (prisma.rateioLancamento.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.conciliacaoBancaria.create as jest.Mock).mockResolvedValue({
        id: 'conc-rateada',
      });
      (prisma.extratoBancario.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.createAndLink('stmt-001', baseData, true, 'user-01'),
      ).resolves.toEqual({ id: 'lanc-rateado' });
      expect(prisma.rateioLancamento.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ obraId: 'obra-01', valor: 900 }),
            expect.objectContaining({
              centroCustoId: 'deposito-01',
              valor: 600,
            }),
          ]),
        }),
      );
    });

    it('rejects allocations whose sum differs from the statement', async () => {
      (prisma.extratoBancario.findUnique as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      const invalidData = {
        ...baseData,
        rateios: [{ ...baseData.rateios[0], valor: 100 }],
      };

      await expect(
        service.createAndLink('stmt-001', invalidData, true, 'user-01'),
      ).rejects.toThrow('deve ser igual ao valor do extrato');
      expect(prisma.lancamentoFinanceiro.create).not.toHaveBeenCalled();
    });
  });
});
