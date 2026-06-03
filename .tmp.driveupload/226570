/*
  Warnings:

  - You are about to drop the `contas_pagar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contas_receber` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pagamentos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PREVISTO', 'REALIZADO', 'CONCILIADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ClassificacaoDRE" AS ENUM ('RECEITA_RECORRENTE', 'RECEITA_NAO_RECORRENTE', 'DEDUCOES_RECEITA', 'CUSTO_SERVICOS_PRESTADOS', 'DESPESA_ADMINISTRATIVA', 'DESPESA_COMERCIAL', 'DESPESA_ESTRUTURAL', 'DESPESA_SOCIOS', 'DESPESA_FINANCEIRA', 'RECEITA_FINANCEIRA', 'IMPOSTOS_LUCRO', 'OUTROS');

-- DropForeignKey
ALTER TABLE "contas_pagar" DROP CONSTRAINT "contas_pagar_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "contas_pagar" DROP CONSTRAINT "contas_pagar_centroCustoId_fkey";

-- DropForeignKey
ALTER TABLE "contas_receber" DROP CONSTRAINT "contas_receber_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "contas_receber" DROP CONSTRAINT "contas_receber_centroCustoId_fkey";

-- DropForeignKey
ALTER TABLE "contas_receber" DROP CONSTRAINT "contas_receber_contratoId_fkey";

-- DropForeignKey
ALTER TABLE "pagamentos" DROP CONSTRAINT "pagamentos_colaboradorId_fkey";

-- AlterTable
ALTER TABLE "categorias_financeiras" ADD COLUMN     "classificacao" "ClassificacaoDRE",
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "aceiteEletronico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consultora" TEXT,
ADD COLUMN     "contratoArquivoUrl" TEXT,
ADD COLUMN     "emailNf" TEXT,
ADD COLUMN     "emissaoNf" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "financeiroEmail" TEXT,
ADD COLUMN     "financeiroNome" TEXT,
ADD COLUMN     "financeiroPreferenciaContato" TEXT,
ADD COLUMN     "financeiroWhatsapp" TEXT,
ADD COLUMN     "foro" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "lgpdAceito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linksUteis" JSONB,
ADD COLUMN     "nicho" TEXT,
ADD COLUMN     "obsFiscais" TEXT,
ADD COLUMN     "qtdConteudo" TEXT,
ADD COLUMN     "redesSociais" JSONB,
ADD COLUMN     "representanteCargo" TEXT,
ADD COLUMN     "representanteCpf" TEXT,
ADD COLUMN     "representanteEmail" TEXT,
ADD COLUMN     "representanteNome" TEXT,
ADD COLUMN     "representanteTelefone" TEXT,
ADD COLUMN     "usuariosAdmins" TEXT;

-- AlterTable
ALTER TABLE "contratos" ADD COLUMN     "diaVencimento" INTEGER,
ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "multaJuros" TEXT,
ADD COLUMN     "quantidadeParcelas" INTEGER,
ADD COLUMN     "tipo" TEXT;

-- DropTable
DROP TABLE "contas_pagar";

-- DropTable
DROP TABLE "contas_receber";

-- DropTable
DROP TABLE "pagamentos";

-- DropEnum
DROP TYPE "StatusConta";

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "tipo" "TipoLancamento" NOT NULL,
    "status" "StatusLancamento" NOT NULL DEFAULT 'PREVISTO',
    "observacoes" TEXT,
    "urlComprovante" TEXT,
    "contaBancariaId" TEXT,
    "categoriaId" TEXT,
    "centroCustoId" TEXT,
    "contratoId" TEXT,
    "clienteId" TEXT,
    "producaoMensalId" TEXT,
    "fornecedor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT,
    "conta" TEXT,
    "saldoInicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extratos_bancarios" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "hash" TEXT NOT NULL,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extratos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacoes_bancarias" (
    "id" TEXT NOT NULL,
    "dataConciliacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lancamentoFinanceiroId" TEXT NOT NULL,
    "extratoBancarioId" TEXT NOT NULL,

    CONSTRAINT "conciliacoes_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos_financeiros" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "receitaMeta" DECIMAL(10,2) NOT NULL,
    "despesaMeta" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extratos_bancarios_hash_key" ON "extratos_bancarios"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_bancarias_lancamentoFinanceiroId_key" ON "conciliacoes_bancarias"("lancamentoFinanceiroId");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_bancarias_extratoBancarioId_key" ON "conciliacoes_bancarias"("extratoBancarioId");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_financeiros_mes_ano_key" ON "orcamentos_financeiros"("mes", "ano");

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_producaoMensalId_fkey" FOREIGN KEY ("producaoMensalId") REFERENCES "producoes_mensais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_bancarias" ADD CONSTRAINT "conciliacoes_bancarias_lancamentoFinanceiroId_fkey" FOREIGN KEY ("lancamentoFinanceiroId") REFERENCES "lancamentos_financeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_bancarias" ADD CONSTRAINT "conciliacoes_bancarias_extratoBancarioId_fkey" FOREIGN KEY ("extratoBancarioId") REFERENCES "extratos_bancarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
