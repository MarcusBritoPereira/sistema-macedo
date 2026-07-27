const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const obraId = 'd33799ac-11ff-4cb6-901a-65d62410bcc1';
  
  const parcelas = await prisma.parcelaObra.findMany({
    where: {
      obraId,
      transacaoId: null,
    },
    orderBy: {
      dataVencimento: 'asc',
    },
    include: {
      obra: {
        include: { cliente: true }
      }
    }
  });

  console.log(`Encontradas ${parcelas.length} parcelas para lançar.`);

  for (const parcela of parcelas) {
    await prisma.$transaction(async (tx) => {
      const numeroParcela = await tx.parcelaObra.count({
        where: {
          obraId: parcela.obraId,
          dataVencimento: {
            lte: parcela.dataVencimento,
          },
        },
      });

      const descricaoParcela = parcela.descricao || `Parcela ${numeroParcela}`;

      const transacao = await tx.lancamentoFinanceiro.create({
        data: {
          descricao: `${descricaoParcela} - ${parcela.obra.nome}`,
          valor: parcela.valor,
          dataVencimento: parcela.dataVencimento,
          dataCompetencia: parcela.dataVencimento,
          tipo: 'RECEITA',
          status: parcela.status === 'RECEBIDO' ? 'REALIZADO' : 'PREVISTO',
          obraId: parcela.obraId,
          clienteId: parcela.obra.clienteId || null,
          tipoLancamento: 'OBRA',
          observacoes: `Lançamento gerado a partir da parcela da obra ${parcela.obra.nome}.`,
        },
      });

      await tx.parcelaObra.update({
        where: { id: parcela.id },
        data: { transacaoId: transacao.id },
      });

      console.log(`Lançada parcela ${parcela.id} -> transação ${transacao.id}`);
    });
  }
  console.log('Finalizado com sucesso.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
