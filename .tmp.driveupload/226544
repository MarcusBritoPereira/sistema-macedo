const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const clientsToImport = [
  {
    razaoSocial: 'Patricia Araujo de Sousa',
    cpf: '510.269.022-15',
    telefone: 'Não informado',
    endereco: 'Av. Mendonça Furtado, nº 1011, Cond. Aqua Residence - apto 2002, Santa Clara',
    ativo: true,
  },
  {
    razaoSocial: 'Elen Cristina Sena Portela',
    cpf: '839.491.512-49',
    telefone: '93 99220-1987',
    endereco: 'Rua NS Um, nº 446, Bloco A - apto 404, Diamantino',
    ativo: true,
  },
  {
    razaoSocial: 'Débora Alexandra Pinho',
    cpf: '886.899.051-20',
    telefone: '66 99977-7900',
    endereco: 'Rua dos Canários, nº 566, Jardim das Nações - Sinop/Pá',
    ativo: true,
  },
  {
    razaoSocial: 'Raimundo Nonato Prado Pontes',
    cpf: '205.495.202-87',
    telefone: 'Não informado',
    endereco: 'Rua da Trindade, nº 236, Esperança',
    ativo: true,
  },
  {
    razaoSocial: 'Alexandre Pereira Jahns Alves',
    cpf: '723.913.592-68',
    telefone: 'Não informado',
    endereco: 'Travessa dos Cabanos, nº 42, Interventoria',
    ativo: true,
  },
  {
    razaoSocial: 'KLP Agropecuaria Ltda',
    nomeFantasia: 'KLP AGROPECUARIA LTDA',
    cnpj: '50.478.821/0001-06',
    telefone: 'Não informado',
    endereco: 'Rod. Santarem Jabuti, Km 27, S/N, Zona Rural - Santarem/Pá',
    ativo: true,
  },
  {
    razaoSocial: 'Adolpho Viana da Costa',
    cpf: '473.517.802-34',
    telefone: '93 99203-3300',
    endereco: 'Av. Mendonça Furtado, nº 3972, Liberdade',
    ativo: true,
  },
  {
    razaoSocial: 'Maria Luciete Rabelo Freire',
    cpf: '414.212.482-04',
    email: 'luciete.rabelo@hotmail.com',
    telefone: '93 99137-9537',
    endereco: 'Trav. Prof. Luís Barbosa, nº 2374, Caranazal',
    ativo: true,
  },
  {
    razaoSocial: 'Bioativa Farmacia de Manipulação',
    nomeFantasia: 'BIOATIVA FARMACIA DE MANIPULACAO LTDA - EPP',
    cnpj: '07.295.260/0001-80',
    telefone: 'Não informado',
    endereco: 'Av. Mendonça Furtado, nº 1691, Santa Clara',
    ativo: true,
  },
  {
    razaoSocial: 'G. Araujo de Andrade Ltda',
    nomeFantasia: 'G. ARAUJO DE ANDRADE LTDA - EPP',
    cnpj: '46.308.097/0001-03',
    telefone: 'Não informado',
    endereco: 'Rua Catuipe, nº 1859 E, Bairro Cidade Nova, Cidade Lucas do Rio Verde - Mato grosso',
    ativo: true,
  },
  {
    razaoSocial: 'Alvaro Junior Magro',
    cpf: '386.822.499-87',
    telefone: 'Não informado',
    endereco: 'Rua Rosa Vermelha, nº 703, Aeroporto Velho',
    ativo: true,
  },
];

async function main() {
  console.log('🤖 Iniciando verificação e importação de clientes...');
  let importedCount = 0;
  let updatedCount = 0;
  let ignoredCount = 0;

  for (const client of clientsToImport) {
    let existing = null;

    if (client.cpf) {
      existing = await prisma.cliente.findUnique({
        where: { cpf: client.cpf },
      });
    } else if (client.cnpj) {
      existing = await prisma.cliente.findUnique({
        where: { cnpj: client.cnpj },
      });
    }

    if (existing) {
      if (!existing.ativo) {
        // Se existe mas está inativo, reativa e atualiza
        await prisma.cliente.update({
          where: { id: existing.id },
          data: {
            ...client,
            ativo: true,
          },
        });
        console.log(`✅ [Reativado & Atualizado] ${client.razaoSocial}`);
        updatedCount++;
      } else {
        // Se já está ativo, ignora
        console.log(`⏭️ [Ignorado - Já Cadastrado] ${client.razaoSocial}`);
        ignoredCount++;
      }
    } else {
      // Se não existe, cria novo
      await prisma.cliente.create({
        data: client,
      });
      console.log(`✨ [Cadastrado Novo] ${client.razaoSocial}`);
      importedCount++;
    }
  }

  console.log('\n📊 Resumo da Importação:');
  console.log(`- Cadastrados novos: ${importedCount}`);
  console.log(`- Reativados/Atualizados: ${updatedCount}`);
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
