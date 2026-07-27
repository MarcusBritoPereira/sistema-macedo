-- AlterEnum
ALTER TYPE "StatusLancamento" ADD VALUE 'PARCIAL';

-- DropIndex
DROP INDEX "conciliacoes_bancarias_lancamentoFinanceiroId_key";

-- CreateTable
CREATE TABLE "recebimentos_lancamentos" (
    "id" TEXT NOT NULL,
    "lancamentoFinanceiroId" TEXT NOT NULL,
    "extratoBancarioId" TEXT NOT NULL,
    "conciliacaoBancariaId" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recebimentos_lancamentos_extratoBancarioId_key" ON "recebimentos_lancamentos"("extratoBancarioId");

-- CreateIndex
CREATE UNIQUE INDEX "recebimentos_lancamentos_conciliacaoBancariaId_key" ON "recebimentos_lancamentos"("conciliacaoBancariaId");

-- CreateIndex
CREATE INDEX "idx_recebimento_lancamento_data" ON "recebimentos_lancamentos"("lancamentoFinanceiroId", "dataRecebimento");

-- AddForeignKey
ALTER TABLE "recebimentos_lancamentos" ADD CONSTRAINT "recebimentos_lancamentos_lancamentoFinanceiroId_fkey" FOREIGN KEY ("lancamentoFinanceiroId") REFERENCES "lancamentos_financeiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_lancamentos" ADD CONSTRAINT "recebimentos_lancamentos_extratoBancarioId_fkey" FOREIGN KEY ("extratoBancarioId") REFERENCES "extratos_bancarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_lancamentos" ADD CONSTRAINT "recebimentos_lancamentos_conciliacaoBancariaId_fkey" FOREIGN KEY ("conciliacaoBancariaId") REFERENCES "conciliacoes_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

