const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const suppliersToImport = [
  { nomeFantasia: 'Agronorte', telefone: '93 88038217' },
  { nomeFantasia: 'Armazem', telefone: '93 991687497' },
  { nomeFantasia: 'Sanferro', telefone: '93 991102027' },
  { nomeFantasia: 'Jonas', telefone: '93 992367500' },
  { nomeFantasia: 'Massafra', telefone: '93 991452343' },
  { nomeFantasia: 'Norte madeira', telefone: '93 992378282' },
  { nomeFantasia: 'Estancia amarelão', telefone: '93 991513602' },
  { nomeFantasia: 'Plamatec', telefone: '93 991535177' },
  { nomeFantasia: 'Acari', telefone: '93 991587716' },
  { nomeFantasia: 'Jade engenharia', telefone: '93 30175000' },
  { nomeFantasia: 'Polimix', telefone: null },
  { nomeFantasia: 'Rhuda construção', telefone: '93 991488752' },
  { nomeFantasia: 'Biola', telefone: '93 992014828' },
  { nomeFantasia: 'Bom gourmet', telefone: null },
  { nomeFantasia: 'Padra epi', telefone: null },
  { nomeFantasia: 'Via construção', telefone: '93 991043696' },
  { nomeFantasia: 'Vetor engenharia', telefone: null },
  { nomeFantasia: 'E J Lima', telefone: '93 991230117' },
  { nomeFantasia: 'A prancheta', telefone: '93 991546169' },
  { nomeFantasia: 'Ceramica curua una', telefone: '93 992134204' },
  { nomeFantasia: 'Casa do serralheiro', telefone: '93 991030063' },
  { nomeFantasia: 'Cantão', telefone: '93 991955234' },
  { nomeFantasia: 'Real elétrica', telefone: '93 991612805' },
  { nomeFantasia: 'Gelo peças', telefone: '93 991313909' },
  { nomeFantasia: 'A C Costa', telefone: null },
  { nomeFantasia: 'A Noronha', telefone: null },
  { nomeFantasia: 'Aço tapajos', telefone: '93 991042270' },
  { nomeFantasia: 'Aqua show', telefone: null },
  { nomeFantasia: 'Atex', telefone: null },
  { nomeFantasia: 'Atacadao 25 de março', telefone: null },
  { nomeFantasia: 'Casa da piscina', telefone: '93 992183381' },
  { nomeFantasia: 'Casa do eletricista', telefone: '93 974006823' },
  { nomeFantasia: 'Central dos compensados', telefone: null },
  { nomeFantasia: 'Ciframa', telefone: null },
  { nomeFantasia: 'Concresan', telefone: null },
  { nomeFantasia: 'Csa do pintor', telefone: null },
  { nomeFantasia: 'Casa forte', telefone: '93 991923040' },
  { nomeFantasia: 'Casa rainha', telefone: '93 991030909' },
  { nomeFantasia: 'Mercado do bairro', telefone: null },
  { nomeFantasia: 'Mercado livre', telefone: null },
  { nomeFantasia: 'Loqmaq', telefone: '93 991508787' },
  { nomeFantasia: 'MTEC geotecnica', telefone: null },
  { nomeFantasia: 'Nobre fire', telefone: null },
  { nomeFantasia: 'Nortao tintas', telefone: '93 992579347' },
];

async function main() {
  console.log('🤖 Iniciando importação de fornecedores...');
  let importedCount = 0;
  let ignoredCount = 0;

  for (const supplier of suppliersToImport) {
    // Busca por nome exato de fantasia para evitar duplicidade
    const existing = await prisma.fornecedor.findFirst({
      where: { nomeFantasia: supplier.nomeFantasia },
    });

    if (existing) {
      console.log(`⏭️ [Ignorado - Já Cadastrado] ${supplier.nomeFantasia}`);
      ignoredCount++;
    } else {
      await prisma.fornecedor.create({
        data: {
          nomeFantasia: supplier.nomeFantasia,
          telefone: supplier.telefone, // Será nulo se não fornecido
          ativo: true,
        },
      });
      console.log(`✨ [Fornecedor Cadastrado] ${supplier.nomeFantasia}`);
      importedCount++;
    }
  }

  console.log('\n📊 Resumo da Importação de Fornecedores:');
  console.log(`- Cadastrados novos: ${importedCount}`);
  console.log(`- Ignorados: ${ignoredCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
