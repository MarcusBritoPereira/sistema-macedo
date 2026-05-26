DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoClassificacaoLancamento') THEN
    CREATE TYPE "TipoClassificacaoLancamento" AS ENUM ('OBRA', 'POS_OBRA', 'ADMINISTRATIVO', 'ESCRITORIO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCustoLancamento') THEN
    CREATE TYPE "TipoCustoLancamento" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'SERVICO', 'EQUIPAMENTO', 'OUTROS');
  END IF;
END $$;

ALTER TABLE "lancamentos_financeiros"
  ALTER COLUMN "tipo_lancamento" TYPE "TipoClassificacaoLancamento"
  USING ("tipo_lancamento"::"TipoClassificacaoLancamento"),
  ALTER COLUMN "tipo_custo" TYPE "TipoCustoLancamento"
  USING ("tipo_custo"::"TipoCustoLancamento");
