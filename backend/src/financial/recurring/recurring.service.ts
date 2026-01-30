import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { FrequenciaRecurrencia, Prisma } from '@prisma/client';
import { addMonths, addWeeks, addYears, isBefore, startOfDay, addDays } from 'date-fns';

@Injectable()
export class RecurringService {
    private readonly logger = new Logger(RecurringService.name);

    constructor(private prisma: PrismaService) { }

    async create(data: {
        frequencia: FrequenciaRecurrencia;
        dataInicio: Date | string;
        dataFim?: Date | string;
        diaVencimento?: number;
        sourceTransactionId: string;
    }) {
        // 1. Create Recurrence
        const recurrence = await this.prisma.recurrencia.create({
            data: {
                frequencia: data.frequencia,
                dataInicio: new Date(data.dataInicio),
                dataFim: data.dataFim ? new Date(data.dataFim) : null,
                diaVencimento: data.diaVencimento,
                ativo: true,
            },
        });

        // 2. Link Source Transaction
        await this.prisma.lancamentoFinanceiro.update({
            where: { id: data.sourceTransactionId },
            data: { recurrenciaId: recurrence.id },
        });

        return recurrence;
    }

    findAll() {
        return this.prisma.recurrencia.findMany({
            where: { ativo: true },
            include: {
                _count: {
                    select: { lancamentos: true }
                }
            }
        });
    }

    async remove(id: string) {
        return this.prisma.recurrencia.update({
            where: { id },
            data: { ativo: false },
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCron() {
        this.logger.debug('Running recurring expenses check...');
        const activeRecurrences = await this.prisma.recurrencia.findMany({
            where: { ativo: true },
            include: {
                lancamentos: {
                    orderBy: { dataVencimento: 'desc' },
                    take: 1
                }
            }
        });

        for (const recurrence of activeRecurrences) {
            try {
                if (!recurrence.lancamentos || recurrence.lancamentos.length === 0) continue;

                const lastTransaction = recurrence.lancamentos[0];
                const lastDate = new Date(lastTransaction.dataVencimento);
                let nextDate: Date;

                // Calculate next date
                if (recurrence.frequencia === 'MENSAL') {
                    nextDate = addMonths(lastDate, 1);
                } else if (recurrence.frequencia === 'SEMANAL') {
                    nextDate = addWeeks(lastDate, 1);
                } else if (recurrence.frequencia === 'ANUAL') {
                    nextDate = addYears(lastDate, 1);
                } else {
                    nextDate = addDays(lastDate, 1);
                }

                // If defined diaVencimento (for monthly), adjust day
                if (recurrence.diaVencimento && recurrence.frequencia === 'MENSAL') {
                    nextDate.setDate(recurrence.diaVencimento);
                    // Handle shifting (e.g. Feb 30) - date-fns addMonths usually handles this, 
                    // but setting date explicitly might overflow. 
                    // Let's rely on simple addMonths for now to keep it safe or simple V1.
                    // Actually, if user set specific day, enforce it? 
                    // Optimization: For V1, just strictly add month.
                }

                // Check end date
                if (recurrence.dataFim && isBefore(new Date(recurrence.dataFim), nextDate)) {
                    // Expired
                    await this.prisma.recurrencia.update({
                        where: { id: recurrence.id },
                        data: { ativo: false }
                    });
                    continue;
                }

                // Lookahead: Generate if next date is within X days from now (e.g. 7 days)?
                // Or just generate if "previous one is passed or it is time".
                // Simple rule: Ensure there is at least one transaction "in the future" or "for current month".
                // If the last transaction is in the past (before today) or today, generate the next one.
                const today = startOfDay(new Date());
                const lastDateStart = startOfDay(lastDate);

                // If the last transaction is already in the future (compared to today), we don't need another one yet?
                // Example: Last is Feb 15. Today is Jan 30. We are good.
                // Example: Last is Jan 15. Today is Jan 30. We need Feb 15.
                if (isBefore(lastDateStart, today) || lastDateStart.getTime() === today.getTime()) {
                    // Create Next Transaction
                    const { id, createdAt, updatedAt, dataPagamento, ...dataToCopy } = lastTransaction;

                    await this.prisma.lancamentoFinanceiro.create({
                        data: {
                            ...dataToCopy,
                            descricao: dataToCopy.descricao, // (Optional: Append (Copy)?) No, keep same.
                            status: 'PREVISTO',
                            dataVencimento: nextDate,
                            dataCompetencia: nextDate, // Usually same as vencimento for recurring
                            urlComprovante: null,
                            recurrenciaId: recurrence.id
                        }
                    });
                    this.logger.log(`Generated recurring transaction for recurrence ${recurrence.id} on ${nextDate}`);
                }

            } catch (e) {
                this.logger.error(`Error processing recurrence ${recurrence.id}`, e);
            }
        }
    }
}
