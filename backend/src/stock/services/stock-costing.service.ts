import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockCostingService {
  toDecimal(value: Prisma.Decimal.Value, fieldName = 'valor') {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite()) {
      throw new BadRequestException(`${fieldName} inválido`);
    }
    return decimal;
  }

  assertPositive(value: Prisma.Decimal.Value, fieldName: string) {
    const decimal = this.toDecimal(value, fieldName);
    if (decimal.lte(0)) {
      throw new BadRequestException(`${fieldName} deve ser maior que zero`);
    }
    return decimal;
  }

  assertNonNegative(value: Prisma.Decimal.Value, fieldName: string) {
    const decimal = this.toDecimal(value, fieldName);
    if (decimal.lt(0)) {
      throw new BadRequestException(`${fieldName} não pode ser negativo`);
    }
    return decimal;
  }

  calculateMovingAverageCost(params: {
    currentQuantity: Prisma.Decimal.Value;
    currentAverageCost: Prisma.Decimal.Value;
    incomingQuantity: Prisma.Decimal.Value;
    incomingUnitCost: Prisma.Decimal.Value;
  }) {
    const currentQuantity = this.assertNonNegative(
      params.currentQuantity,
      'saldo atual',
    );
    const currentAverageCost = this.assertNonNegative(
      params.currentAverageCost,
      'custo médio atual',
    );
    const incomingQuantity = this.assertPositive(
      params.incomingQuantity,
      'quantidade de entrada',
    );
    const incomingUnitCost = this.assertNonNegative(
      params.incomingUnitCost,
      'custo de entrada',
    );

    const totalQuantity = currentQuantity.plus(incomingQuantity);
    if (totalQuantity.eq(0)) return new Prisma.Decimal(0);

    return currentQuantity
      .mul(currentAverageCost)
      .plus(incomingQuantity.mul(incomingUnitCost))
      .div(totalQuantity);
  }

  calculateTotal(quantity: Prisma.Decimal.Value, unitCost: Prisma.Decimal.Value) {
    const safeQuantity = this.assertPositive(quantity, 'quantidade');
    const safeUnitCost = this.assertNonNegative(unitCost, 'custo unitário');
    return safeQuantity.mul(safeUnitCost);
  }
}
