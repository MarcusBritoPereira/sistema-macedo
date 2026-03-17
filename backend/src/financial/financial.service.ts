import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  // This service might be deprecated if it only handled receivables/payables.
  // Keeping it empty for now or for shared non-transaction logic.
}
