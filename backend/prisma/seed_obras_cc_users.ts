import { PrismaClient, StatusObra } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Carga de Dados não-destrutiva (Obras, Centros de Custo e Usuários)...');

  // 1. Obter ou Criar Perfis
  const adminProfile = await prisma.perfil.upsert({
    where: { nome: 'ADMIN' },
    update: {},
    create: { nome: 'ADMIN', descricao: 'Acesso Total', permissoes: { all: true } },
  });

  const finProfile = await prisma.perfil.upsert({
    where: { nome: 'FINANCEIRO' },
    update: {},
    create: { nome: 'FINANCEIRO', descricao: 'Gestão Financeira', permissoes: { financial: true } },
  });

  console.log('✅ Perfis de Acesso validados.');

  // 2. Criar mais Usuários Fictícios (Senha Padrão: 123456)
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash('123456', salt);

  const usuariosFicticios = [
    { email: 'pedro.fiscal@macedo.com', nome: 'Pedro Fiscal', perfilId: finProfile.id },
    { email: 'mariana.suprimentos@macedo.com', nome: 'Mariana Suprimentos', perfilId: finProfile.id },
    { email: 'ricardo.engenharia@macedo.com', nome: 'Ricardo Engenheiro', perfilId: finProfile.id },
    { email: 'carlos.diretor@macedo.com', nome: 'Carlos Diretor', perfilId: adminProfile.id },
  ];

  let usersCreated = 0;
  for (const u of usuariosFicticios) {
    const exists = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (!exists) {
      await prisma.usuario.create({
        data: {
          email: u.email,
          nome: u.nome,
          senha: hashedPassword,
          perfilId: u.perfilId,
          ativo: true
        }
      });
      usersCreated++;
    }
  }
  console.log(`✅ ${usersCreated} novos usuários fictícios criados.`);

  // 2.5 Criar Perfis e Usuários Reais Solicitados
  const analistaProfile = await prisma.perfil.upsert({
    where: { nome: 'ANALISTA' },
    update: {},
    create: { nome: 'ANALISTA', descricao: 'Perfil de Analista', permissoes: { readOnly: true } },
  });

  const passAdmin123 = await bcrypt.hash('admin123', salt);

  const usuariosReais = [
    { email: 'engjessicamiranda91@gmail.com', nome: 'Jessica Miranda', perfilId: analistaProfile.id, senha: passAdmin123 },
    { email: 'jovanarodrigues41@gmail.com', nome: 'Jovana Rodrigues', perfilId: adminProfile.id, senha: passAdmin123 },
    { email: 'marcusrodrigo2@gmail.com', nome: 'Marcus Rodrigo', perfilId: adminProfile.id, senha: passAdmin123 }
  ];

  let realUsersCreated = 0;
  for (const u of usuariosReais) {
    const exists = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (!exists) {
      await prisma.usuario.create({
        data: {
          nome: u.nome,
          email: u.email,
          senha: u.senha,
          perfilId: u.perfilId,
          ativo: true
        }
      });
      realUsersCreated++;
    }
  }
  console.log(`✅ ${realUsersCreated} usuários reais criados.`);

  // 3. Criar Centros de Custo de Obras e Administrativos
  const ccData = [
    // Estrutura de Obras
    { nome: 'Obras Gerais', codigo: '1.0', ativo: true, aceitaLancamento: false },
    { nome: 'Fundação e Infraestrutura', codigo: '1.01', ativo: true, aceitaLancamento: true },
    { nome: 'Estrutura e Superestrutura', codigo: '1.02', ativo: true, aceitaLancamento: true },
    { nome: 'Alvenaria e Vedações', codigo: '1.03', ativo: true, aceitaLancamento: true },
    { nome: 'Acabamentos e Revestimentos', codigo: '1.04', ativo: true, aceitaLancamento: true },
    { nome: 'Instalações Elétricas e Hidráulicas', codigo: '1.05', ativo: true, aceitaLancamento: true },
    
    // Estrutura Administrativa
    { nome: 'Administrativo & Escritório Central', codigo: '2.0', ativo: true, aceitaLancamento: false },
    { nome: 'Despesas de Escritório', codigo: '2.01', ativo: true, aceitaLancamento: true },
    { nome: 'Pessoal & RH', codigo: '2.02', ativo: true, aceitaLancamento: true },
    { nome: 'Marketing e Vendas', codigo: '2.03', ativo: true, aceitaLancamento: true }
  ];

  const ccMap = new Map<string, string>();
  let ccCreated = 0;
  for (const cc of ccData) {
    let exists = await prisma.centroCusto.findFirst({ where: { codigo: cc.codigo } });
    if (!exists) {
      exists = await prisma.centroCusto.create({
        data: cc
      });
      ccCreated++;
    }
    ccMap.set(cc.codigo, exists.id);
  }
  console.log(`✅ ${ccCreated} novos Centros de Custo de Obras criados.`);

  // Vincular Hierarquia dos Centros de Custo (Pai -> Filho)
  await prisma.centroCusto.updateMany({
    where: { codigo: { in: ['1.01', '1.02', '1.03', '1.04', '1.05'] } },
    data: { parentId: ccMap.get('1.0') }
  });

  await prisma.centroCusto.updateMany({
    where: { codigo: { in: ['2.01', '2.02', '2.03'] } },
    data: { parentId: ccMap.get('2.0') }
  });
  console.log('✅ Hierarquias de Centro de Custo atualizadas.');

  // 4. Obter Cliente para vincular às Obras
  let client = await prisma.cliente.findFirst();
  if (!client) {
    console.log('⚠️ Nenhum cliente existente encontrado. Criando um cliente padrão...');
    client = await prisma.cliente.create({
      data: {
        razaoSocial: 'Incorporadora Macedo Ltda',
        nomeFantasia: 'Macedo Incorporadora',
        cnpj: '12.345.678/0001-90',
        email: 'incorporacao@macedo.com',
        ativo: true
      }
    });
  }

  // 5. Criar Obras Fictícias
  const obrasFicticias = [
    {
      nome: 'Residencial Bela Vista',
      descricao: 'Construção de edifício residencial de 12 andares.',
      dataInicio: new Date('2026-02-10'),
      dataPrevisaoFim: new Date('2027-12-20'),
      status: StatusObra.EM_ANDAMENTO,
      orcamentoPrevisto: 1250000.00,
      endereco: 'Av. das Palmeiras, 450 - Centro',
      clienteId: client.id,
      centroCustoId: ccMap.get('1.0')
    },
    {
      nome: 'Reforma Comercial Centro',
      descricao: 'Reforma e modernização da fachada e interior de loja comercial.',
      dataInicio: new Date('2026-05-01'),
      dataPrevisaoFim: new Date('2026-08-30'),
      status: StatusObra.PLANEJAMENTO,
      orcamentoPrevisto: 180000.00,
      endereco: 'Rua Direita, 89 - Comércio',
      clienteId: client.id,
      centroCustoId: ccMap.get('1.01')
    },
    {
      nome: 'Galpão Logístico Leste',
      descricao: 'Construção de estrutura metálica para estocagem e distribuição.',
      dataInicio: new Date('2026-01-15'),
      dataPrevisaoFim: new Date('2026-11-30'),
      status: StatusObra.PAUSADA,
      orcamentoPrevisto: 3400000.00,
      endereco: 'Rodovia BR-101, Km 45 - Setor Industrial',
      clienteId: client.id,
      centroCustoId: ccMap.get('1.02')
    },
    {
      nome: 'Condomínio Costa Verde',
      descricao: 'Obras de infraestrutura urbana, saneamento e pavimentação do condomínio.',
      dataInicio: new Date('2025-10-05'),
      dataPrevisaoFim: new Date('2026-09-15'),
      status: StatusObra.EM_ANDAMENTO,
      orcamentoPrevisto: 890000.00,
      endereco: 'Estrada do Forte, S/N - Litoral',
      clienteId: client.id,
      centroCustoId: ccMap.get('1.03')
    }
  ];

  let obrasCreated = 0;
  for (const o of obrasFicticias) {
    const exists = await prisma.obra.findFirst({ where: { nome: o.nome } });
    if (!exists) {
      await prisma.obra.create({
        data: o
      });
      obrasCreated++;
    }
  }
  console.log(`✅ ${obrasCreated} novas Obras fictícias integradas com sucesso.`);

  // 6. Cadastrar Conta Bancária Sicredi (Macedo Construtora)
  const contaSicrediExists = await prisma.contaBancaria.findFirst({ where: { conta: '08039-3' } });
  if (!contaSicrediExists) {
    await prisma.contaBancaria.create({
      data: {
        nome: 'Sicredi',
        banco: 'Banco Cooperativo Sicredi S.A. - Bansicredi',
        codigoBanco: '748',
        agencia: '0818',
        conta: '08039-3',
        saldoInicial: 0
      }
    });
    console.log('✅ Conta Bancária do Sicredi criada com sucesso.');
  }

  // 7. Cadastrar Caixinha (Dinheiro em Espécie)
  const caixinhaExists = await prisma.contaBancaria.findFirst({ where: { nome: 'Caixinha (Dinheiro em Espécie)' } });
  if (!caixinhaExists) {
    await prisma.contaBancaria.create({
      data: {
        nome: 'Caixinha (Dinheiro em Espécie)',
        banco: 'Caixa Interno',
        codigoBanco: '999',
        agencia: '',
        conta: '',
        saldoInicial: 0
      }
    });
    console.log('✅ Caixinha (Dinheiro em Espécie) criada com sucesso.');
  }

  console.log('🚀 CARGA DE DADOS CONCLUÍDA SEM PERDA DE DADOS EXISTENTES!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a carga de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
