-- Financial performance indexes
CREATE INDEX IF NOT EXISTS "idx_lancamento_tipo_status_venc"
ON "lancamentos_financeiros" ("tipo", "status", "dataVencimento");

CREATE INDEX IF NOT EXISTS "idx_lancamento_conta_status_venc"
ON "lancamentos_financeiros" ("contaBancariaId", "status", "dataVencimento");

CREATE INDEX IF NOT EXISTS "idx_lancamento_categoria_comp"
ON "lancamentos_financeiros" ("categoriaId", "dataCompetencia");

CREATE INDEX IF NOT EXISTS "idx_lancamento_cliente_venc"
ON "lancamentos_financeiros" ("clienteId", "dataVencimento");

CREATE INDEX IF NOT EXISTS "idx_lancamento_fornecedor_venc"
ON "lancamentos_financeiros" ("fornecedorId", "dataVencimento");

CREATE INDEX IF NOT EXISTS "idx_extrato_data_conciliado"
ON "extratos_bancarios" ("data", "conciliado");

CREATE INDEX IF NOT EXISTS "idx_extrato_importacao_conciliado"
ON "extratos_bancarios" ("importacaoId", "conciliado");
