import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ObrasService } from './src/financial/obras/obras.service';

async function bootstrap() {
  console.log('Inicializando contexto NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const obrasService = app.get(ObrasService);
  const obraId = 'd33799ac-11ff-4cb6-901a-65d62410bcc1';
  // fake user id or a real one - since the function requires it for logs
  const usuarioId = '00000000-0000-0000-0000-000000000000';
  
  console.log(`Lançando parcelas para a obra ${obraId}...`);
  try {
    const result = await obrasService.lancarTodasParcelasContasReceber(obraId, usuarioId);
    console.log('Sucesso:', result);
  } catch (error) {
    console.error('Erro ao lançar:', error.message);
  }
  await app.close();
  process.exit(0);
}
bootstrap();
