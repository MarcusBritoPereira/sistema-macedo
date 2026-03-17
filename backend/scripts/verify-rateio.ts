import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DreService } from '../src/financial/dre/dre.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClassificacaoDRE, TipoLancamento, StatusLancamento } from '@prisma/client';
import { format } from 'date-fns';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dreService = app.get(DreService);
  const prisma = app.get(PrismaService);

  console.log('🚀 Starting Rateio Verification...');

  try {
    // 1. Setup Test Data
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log('--- Cleaning temp test data ---');
    await prisma.rateioLancamento.deleteMany({ where: { observacao: 'TEST_RATEIO_VERIFICATION' } });
    await prisma.lancamentoFinanceiro.deleteMany({ where: { observacoes: 'TEST_RATEIO_VERIFICATION' } });

    /*
   ### 3. Sync with GitHub (PR #14)
O sistema foi sincronizado com as melhorias de UI e tratamento de erros do PR #14.
- **Melhorias:** Estados de erro em formulários, padronização de feedbacks e ajustes na Conciliação.
- **Status:** Branches `main` e `pr-14` unificadas e enviadas ao GitHub.

### 4. Production Deployment
O stack completo foi reiniciado e reconstruído via Docker Compose:
- **Backend:** Atualizado com DRE, Rateio e correções de segurança.
- **Frontend:** Nova DRE e melhorias do PR #14 integradas.
- **Login:** Acesso restabelecido com a senha temporária `123456`.
*/
    // Find or Create a valid bank account and category for the base transaction
    let conta = await prisma.contaBancaria.findFirst();
    if (!conta) {
        console.log('--- Creating Test Bank Account ---');
        conta = await prisma.contaBancaria.create({
            data: { nome: 'Banco Teste', banco: 'Teste', saldoInicial: 1000 }
        });
    }

    let categoriaBase = await prisma.categoriaFinanceira.findFirst();
    if (!categoriaBase) {
        console.log('--- Creating Test Category ---');
        categoriaBase = await prisma.categoriaFinanceira.create({
            data: { nome: 'Categoria Teste', tipo: TipoLancamento.RECEITA === 'RECEITA' ? 'RECEITA' as any : 'DESPESA' as any }
        });
    }

    if (!conta || !categoriaBase) {
        throw new Error('Could not find or create base data (bank account or category) to run test.');
    }

    console.log('--- Creating Test Transaction (R$ 1000.00) ---');
    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        descricao: 'Teste Rateio DRE',
        valor: 1000.00,
        dataVencimento: today,
        dataPagamento: today,
        tipo: TipoLancamento.DESPESA,
        status: StatusLancamento.REALIZADO,
        observacoes: 'TEST_RATEIO_VERIFICATION',
        contaBancariaId: conta.id,
        categoriaId: categoriaBase.id,
      },
    });

    console.log('--- Applying Rateio (60% Admin, 40% Comercial) ---');
    await prisma.rateioLancamento.createMany({
      data: [
        {
          lancamentoId: lancamento.id,
          valor: 600.00,
          categoria: ClassificacaoDRE.DESPESA_ADMINISTRATIVA,
          subcategoria: 'Teste Admin',
          observacao: 'TEST_RATEIO_VERIFICATION',
          recorrente: false,
        },
        {
          lancamentoId: lancamento.id,
          valor: 400.00,
          categoria: ClassificacaoDRE.DESPESA_COMERCIAL,
          subcategoria: 'Teste Comercial',
          observacao: 'TEST_RATEIO_VERIFICATION',
          recorrente: false,
        },
      ],
    });

    // 2. Run DRE
    console.log('--- Generating DRE Report ---');
    const dre = await dreService.gerar({
      regime: 'caixa' as any,
      dataInicio: format(startOfMonth, 'yyyy-MM-dd'),
      dataFim: format(endOfMonth, 'yyyy-MM-dd'),
      granularidade: 'mensal' as any,
    });

    // 3. Assertions
    const pKey = dre.periodos[0];
    const valAdmin = dre.data[ClassificacaoDRE.DESPESA_ADMINISTRATIVA].periodos[pKey];
    const valComercial = dre.data[ClassificacaoDRE.DESPESA_COMERCIAL].periodos[pKey];

    console.log(`Results for ${pKey}:`);
    console.log(`- DESPESA_ADMINISTRATIVA: R$ ${valAdmin}`);
    console.log(`- DESPESA_COMERCIAL: R$ ${valComercial}`);

    if (valAdmin >= 600 && valComercial >= 400) {
      console.log('✅ SUCCESS: Rateio values correctly reflected in DRE!');
    } else {
      console.log('❌ FAILURE: Rateio values do not match expected sum.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('--- Cleaning up test data ---');
    await prisma.rateioLancamento.deleteMany({ where: { observacao: 'TEST_RATEIO_VERIFICATION' } });
    await prisma.lancamentoFinanceiro.deleteMany({ where: { observacoes: 'TEST_RATEIO_VERIFICATION' } });
    await app.close();
  }
}

bootstrap();
