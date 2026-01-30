import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RecurringService } from '../src/financial/recurring/recurring.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const recurringService = app.get(RecurringService);

    console.log('--- Starting Recurrence Verification ---');

    // 1. Create Source Transaction
    const transaction = await prisma.lancamentoFinanceiro.create({
        data: {
            descricao: 'Test Recurring Transaction',
            valor: 100.00,
            tipo: 'DESPESA',
            status: 'REALIZADO',
            dataVencimento: new Date(), // Today
            dataCompetencia: new Date(),
        }
    });
    console.log('1. Created Transaction:', transaction.id);

    // 2. Create Recurrence (Monthly)
    await recurringService.create({
        frequencia: 'MENSAL',
        dataInicio: new Date(),
        diaVencimento: new Date().getDate(),
        sourceTransactionId: transaction.id
    });
    console.log('2. Created Recurrence linked to Transaction');

    // 3. Simulate Cron (Process Recurring)
    console.log('3. Running Cron Job...');
    await recurringService.handleCron();

    // 4. Verify Next Transaction
    const items = await prisma.lancamentoFinanceiro.findMany({
        where: {
            descricao: 'Test Recurring Transaction',
            status: 'PREVISTO'
        },
        orderBy: { createdAt: 'desc' }
    });

    // Note: My recurring logic checks "if (lastDate <= today)".
    // Since I just created one for TODAY, next date is +1 Month.
    // The logic:
    // "Last is Jan 30 (Today). Today is Jan 30. We are good." -> logic might interpret "It is due".
    // Wait, if last date is TODAY, and we run cron TODAY, do we generate the NEXT one?
    // Usually, we generate the one for *next month* in advance? 
    // My logic: `if (isBefore(lastDate, today) || lastDate.getTime() === today.getTime())`
    // Yes, if last date is today, we generate the next one (due next month).

    // Let's check results.
    const allItems = await prisma.lancamentoFinanceiro.findMany({
        where: { recurrenciaId: { not: null } }
    });
    console.log('Found Transactions Linked to Recurrence:', allItems.length);
    allItems.forEach(i => console.log(`- ${i.descricao} Due: ${i.dataVencimento}`));

    if (allItems.length >= 2) {
        console.log('SUCCESS: Recurrence generated new transaction.');
    } else {
        console.log('WARNING: Did not generate new transaction. Check logic.');
    }

    // Cleanup
    await prisma.recurrencia.deleteMany({ where: { lancamentos: { some: { id: transaction.id } } } });
    await prisma.lancamentoFinanceiro.deleteMany({ where: { descricao: 'Test Recurring Transaction' } });

    await app.close();
}

bootstrap();
