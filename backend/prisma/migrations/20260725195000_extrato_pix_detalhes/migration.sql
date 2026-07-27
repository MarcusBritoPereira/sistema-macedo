ALTER TABLE "extratos_bancarios"
ADD COLUMN "descricaoPix" TEXT,
ADD COLUMN "endToEndId" TEXT,
ADD COLUMN "idTransacaoBanco" TEXT;

CREATE INDEX "idx_extrato_end_to_end"
ON "extratos_bancarios" ("endToEndId");

CREATE INDEX "idx_extrato_id_transacao_banco"
ON "extratos_bancarios" ("idTransacaoBanco");
