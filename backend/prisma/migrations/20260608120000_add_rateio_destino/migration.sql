CREATE TYPE "TipoDestinoRateio" AS ENUM ('OBRA', 'CENTRO_CUSTO');

ALTER TABLE "rateios_lancamento"
ADD COLUMN "obraId" TEXT,
ADD COLUMN "centroCustoId" TEXT,
ADD COLUMN "tipo_destino" "TipoDestinoRateio",
ADD COLUMN "tipo_custo" "TipoCustoLancamento",
ADD COLUMN "categoria_custo" TEXT,
ADD COLUMN "descricao_item" TEXT,
ADD COLUMN "quantidade" DECIMAL(12,3),
ADD COLUMN "valor_unitario" DECIMAL(10,2);

ALTER TABLE "rateios_lancamento"
ADD CONSTRAINT "rateios_lancamento_obraId_fkey"
FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rateios_lancamento"
ADD CONSTRAINT "rateios_lancamento_centroCustoId_fkey"
FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "rateios_lancamento_obraId_idx" ON "rateios_lancamento"("obraId");
CREATE INDEX "rateios_lancamento_centroCustoId_idx" ON "rateios_lancamento"("centroCustoId");
