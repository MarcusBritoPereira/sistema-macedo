import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STOCK_PERMISSIONS = [
  'ESTOQUE_VISUALIZAR',
  'ESTOQUE_MATERIAL_CRIAR',
  'ESTOQUE_MATERIAL_EDITAR',
  'ESTOQUE_LOCAL_GERENCIAR',
  'ESTOQUE_ENTRADA_CRIAR',
  'ESTOQUE_ENTRADA_APROVAR',
  'ESTOQUE_SAIDA_CRIAR',
  'ESTOQUE_SAIDA_APROVAR',
  'ESTOQUE_TRANSFERIR',
  'ESTOQUE_AJUSTAR',
  'ESTOQUE_INVENTARIO_CRIAR',
  'ESTOQUE_INVENTARIO_APROVAR',
  'ESTOQUE_SOLICITAR',
  'ESTOQUE_SOLICITACAO_APROVAR',
  'ESTOQUE_RELATORIOS',
  'ESTOQUE_CONFIGURACOES',
  'ESTOQUE_PERMITIR_SALDO_NEGATIVO',
] as const;

function mergePermissions(current: unknown, additions: readonly string[]) {
  if (
    current &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    (current as Record<string, unknown>).all === true
  ) {
    return current;
  }

  if (Array.isArray(current)) {
    return Array.from(new Set([...current.filter((v) => typeof v === 'string'), ...additions]));
  }

  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  for (const permission of additions) {
    if (base[permission] === undefined) base[permission] = true;
  }

  return base;
}

async function main() {
  const profiles = await prisma.perfil.findMany({
    where: { nome: { in: ['ADMIN', 'FINANCEIRO'] } },
  });

  for (const profile of profiles) {
    const additions =
      profile.nome === 'FINANCEIRO'
        ? [
            'ESTOQUE_VISUALIZAR',
            'ESTOQUE_ENTRADA_CRIAR',
            'ESTOQUE_RELATORIOS',
          ]
        : STOCK_PERMISSIONS;

    await prisma.perfil.update({
      where: { id: profile.id },
      data: { permissoes: mergePermissions(profile.permissoes, additions) },
    });
  }

  console.log('Permissões de estoque aplicadas de forma idempotente.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
