
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BankingIntegrationService } from './src/financial/banking-integration/banking-integration.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const bankingService = app.get(BankingIntegrationService);

    const accountId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
    console.log(`Checking balance for account: ${accountId}`);

    try {
        const balance = await bankingService.getAccountBalance(accountId);
        console.log(`REAL_TIME_BALANCE_START:${balance}:REAL_TIME_BALANCE_END`);
    } catch (error) {
        console.error('Error fetching balance:', error.message);
    } finally {
        await app.close();
    }
}
bootstrap();
