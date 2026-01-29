
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial')
@UseGuards(AuthGuard('jwt'))
export class FinancialController {
    constructor(private readonly financialService: FinancialService) { }

    // Endpoints for legacy direct access removed. 
    // Use /financial/transactions for all financial operations.
}
