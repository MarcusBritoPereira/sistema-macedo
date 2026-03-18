-- AlterTable
ALTER TABLE "rateios_lancamento" ADD COLUMN "updatedBy" TEXT;

-- CreateTable
CREATE TABLE "rateios_historico" (
    "id" TEXT NOT NULL,
    "rateioId" TEXT,
    "lancamentoId" TEXT NOT NULL,
    "valorAntigo" DECIMAL(10,2),
    "valorNovo" DECIMAL(10,2),
    "categoriaAntiga" TEXT,
    "categoriaNova" TEXT,
    "dataEdicao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario" TEXT NOT NULL,

    CONSTRAINT "rateios_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dre_cache" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dre_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dre_cache_chave_key" ON "dre_cache"("chave");

-- AddForeignKey
ALTER TABLE "rateios_historico" ADD CONSTRAINT "rateios_historico_rateioId_fkey" FOREIGN KEY ("rateioId") REFERENCES "rateios_lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateios_historico" ADD CONSTRAINT "rateios_historico_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos_financeiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
