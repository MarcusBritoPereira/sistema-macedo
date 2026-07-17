import { BadRequestException } from '@nestjs/common';
import { StockCostingService } from './stock-costing.service';

describe('StockCostingService', () => {
  let service: StockCostingService;

  beforeEach(() => {
    service = new StockCostingService();
  });

  it('calcula custo médio ponderado móvel em entrada', () => {
    const result = service.calculateMovingAverageCost({
      currentQuantity: '10',
      currentAverageCost: '20',
      incomingQuantity: '5',
      incomingUnitCost: '32',
    });

    expect(result.toFixed(4)).toBe('24.0000');
  });

  it('mantém o custo da entrada quando saldo anterior é zero', () => {
    const result = service.calculateMovingAverageCost({
      currentQuantity: '0',
      currentAverageCost: '0',
      incomingQuantity: '3',
      incomingUnitCost: '17.45',
    });

    expect(result.toFixed(4)).toBe('17.4500');
  });

  it('rejeita quantidade de entrada zerada ou negativa', () => {
    expect(() =>
      service.calculateMovingAverageCost({
        currentQuantity: '10',
        currentAverageCost: '20',
        incomingQuantity: '0',
        incomingUnitCost: '30',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita custo negativo', () => {
    expect(() => service.assertNonNegative('-0.01', 'custo')).toThrow(
      BadRequestException,
    );
  });
});
