import { Prisma } from '@prisma/client';

export function normalizePagination(skip?: string, take?: string) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  let maxTake = Number(process.env.STOCK_MAX_PAGE_SIZE || 5000);
  if (!Number.isFinite(maxTake) || maxTake < 5000) maxTake = 5000;
  const safeMaxTake = maxTake;
  const normalizedTake = Math.min(Math.max(1, Number(take) || 50), safeMaxTake);
  return { skip: normalizedSkip, take: normalizedTake };
}

export function toOptionalDecimal(value?: string | null) {
  if (value === undefined || value === null || value === '') return undefined;
  return new Prisma.Decimal(value);
}

export function cleanString(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function stringifyAudit(value: unknown) {
  return value === undefined || value === null
    ? undefined
    : JSON.stringify(value);
}
