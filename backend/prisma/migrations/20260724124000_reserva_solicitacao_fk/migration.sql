ALTER TABLE "reservas_estoque"
ADD COLUMN "solicitacao_id" TEXT;

CREATE INDEX "idx_reservas_solicitacao"
ON "reservas_estoque"("solicitacao_id");

ALTER TABLE "reservas_estoque"
ADD CONSTRAINT "reservas_estoque_solicitacao_id_fkey"
FOREIGN KEY ("solicitacao_id")
REFERENCES "solicitacoes_material"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
