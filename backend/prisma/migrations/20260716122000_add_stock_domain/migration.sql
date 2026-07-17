-- CreateEnum
CREATE TYPE "UnidadeMedidaMaterial" AS ENUM ('UN', 'KG', 'G', 'T', 'M', 'M2', 'M3', 'L', 'ML', 'CX', 'PCT', 'SC', 'RL', 'BD', 'GL');

-- CreateEnum
CREATE TYPE "TipoLocalEstoque" AS ENUM ('ESTOQUE_CENTRAL', 'DEPOSITO', 'ALMOXARIFADO', 'OBRA', 'CANTEIRO', 'LOCAL_TEMPORARIO');

-- CreateEnum
CREATE TYPE "TipoMovimentoEstoque" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_DEVOLUCAO', 'ENTRADA_DOACAO', 'ENTRADA_AJUSTE', 'SAIDA_CONSUMO', 'SAIDA_PERDA', 'SAIDA_DEVOLUCAO_FORNECEDOR', 'SAIDA_AJUSTE', 'TRANSFERENCIA', 'RESERVA', 'LIBERACAO_RESERVA', 'INVENTARIO', 'ESTORNO');

-- CreateEnum
CREATE TYPE "StatusMovimentoEstoque" AS ENUM ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'EFETIVADO', 'CANCELADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoEstoque" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO', 'AJUSTE', 'INVENTARIO');

-- CreateEnum
CREATE TYPE "StatusDocumentoEstoque" AS ENUM ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'EFETIVADO', 'CANCELADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "StatusReservaEstoque" AS ENUM ('PENDENTE', 'APROVADA', 'ATENDIDA', 'PARCIALMENTE_ATENDIDA', 'CANCELADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoMaterial" AS ENUM ('RASCUNHO', 'ENVIADA', 'EM_ANALISE', 'APROVADA', 'PARCIALMENTE_APROVADA', 'REJEITADA', 'SEPARACAO', 'PARCIALMENTE_ATENDIDA', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PrioridadeSolicitacaoMaterial" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatusInventarioEstoque" AS ENUM ('ABERTO', 'EM_CONTAGEM', 'PENDENTE_APROVACAO', 'APROVADO', 'FECHADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusOrcamentoMaterialObra" AS ENUM ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'CANCELADO', 'SUBSTITUIDO');

-- CreateTable
CREATE TABLE "categorias_material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "parent_id" TEXT,
    "categoria_financeira_id" TEXT,
    "centro_custo_padrao_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria_material_id" TEXT NOT NULL,
    "unidade" "UnidadeMedidaMaterial" NOT NULL,
    "codigo_barras" TEXT,
    "referencia_fornecedor" TEXT,
    "marca" TEXT,
    "fabricante" TEXT,
    "estoque_minimo" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "estoque_maximo" DECIMAL(15,3),
    "ponto_reposicao" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "custo_padrao" DECIMAL(15,4),
    "ultimo_custo" DECIMAL(15,4),
    "custo_medio" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "permite_fracionado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_estoque" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoLocalEstoque" NOT NULL,
    "obra_id" TEXT,
    "responsavel_id" TEXT,
    "endereco" TEXT,
    "permite_saldo_negativo" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locais_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_estoque" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "local_estoque_id" TEXT NOT NULL,
    "quantidade" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantidade_reservada" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "custo_medio" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoMovimentoEstoque" NOT NULL,
    "status" "StatusMovimentoEstoque" NOT NULL DEFAULT 'EFETIVADO',
    "material_id" TEXT NOT NULL,
    "local_origem_id" TEXT,
    "local_destino_id" TEXT,
    "obra_id" TEXT,
    "fornecedor_id" TEXT,
    "quantidade" DECIMAL(15,3) NOT NULL,
    "unidade" "UnidadeMedidaMaterial" NOT NULL,
    "custo_unitario" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "custo_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldo_anterior_origem" DECIMAL(15,3),
    "saldo_posterior_origem" DECIMAL(15,3),
    "saldo_anterior_destino" DECIMAL(15,3),
    "saldo_posterior_destino" DECIMAL(15,3),
    "data_movimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento_tipo" TEXT,
    "documento_numero" TEXT,
    "nota_fiscal_numero" TEXT,
    "nota_fiscal_chave" TEXT,
    "observacao" TEXT,
    "movimento_relacionado_id" TEXT,
    "documento_estoque_id" TEXT,
    "transacao_financeira_id" TEXT,
    "solicitado_por_id" TEXT,
    "aprovado_por_id" TEXT,
    "registrado_por_id" TEXT,
    "cancelado_por_id" TEXT,
    "motivo_cancelamento" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_estoque" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoDocumentoEstoque" NOT NULL,
    "status" "StatusDocumentoEstoque" NOT NULL DEFAULT 'RASCUNHO',
    "fornecedor_id" TEXT,
    "obra_id" TEXT,
    "local_origem_id" TEXT,
    "local_destino_id" TEXT,
    "data_documento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento_fiscal" TEXT,
    "valor_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "transacao_financeira_id" TEXT,
    "criado_por_id" TEXT,
    "aprovado_por_id" TEXT,
    "efetivado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_documento_estoque" (
    "id" TEXT NOT NULL,
    "documento_estoque_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantidade" DECIMAL(15,3) NOT NULL,
    "custo_unitario" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "custo_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lote" TEXT,
    "data_validade" TIMESTAMP(3),
    "observacao" TEXT,

    CONSTRAINT "itens_documento_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventarios_estoque" (
    "id" TEXT NOT NULL,
    "local_estoque_id" TEXT NOT NULL,
    "status" "StatusInventarioEstoque" NOT NULL DEFAULT 'ABERTO',
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fechamento" TIMESTAMP(3),
    "criado_por_id" TEXT,
    "aprovado_por_id" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventarios_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_inventario_estoque" (
    "id" TEXT NOT NULL,
    "inventario_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantidade_sistema" DECIMAL(15,3) NOT NULL,
    "quantidade_contada" DECIMAL(15,3) NOT NULL,
    "diferenca" DECIMAL(15,3) NOT NULL,
    "custo_medio" DECIMAL(15,4) NOT NULL,
    "valor_diferenca" DECIMAL(15,2) NOT NULL,
    "justificativa" TEXT,

    CONSTRAINT "itens_inventario_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_estoque" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "local_estoque_id" TEXT NOT NULL,
    "obra_id" TEXT,
    "quantidade" DECIMAL(15,3) NOT NULL,
    "status" "StatusReservaEstoque" NOT NULL DEFAULT 'PENDENTE',
    "finalidade" TEXT,
    "solicitado_por_id" TEXT,
    "aprovado_por_id" TEXT,
    "data_necessidade" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_material" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "local_destino_id" TEXT,
    "solicitante_id" TEXT NOT NULL,
    "aprovador_id" TEXT,
    "status" "StatusSolicitacaoMaterial" NOT NULL DEFAULT 'RASCUNHO',
    "prioridade" "PrioridadeSolicitacaoMaterial" NOT NULL DEFAULT 'NORMAL',
    "data_necessidade" TIMESTAMP(3),
    "justificativa" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_solicitacao_material" (
    "id" TEXT NOT NULL,
    "solicitacao_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantidade_solicitada" DECIMAL(15,3) NOT NULL,
    "quantidade_aprovada" DECIMAL(15,3),
    "quantidade_atendida" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "observacao" TEXT,

    CONSTRAINT "itens_solicitacao_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos_material_obra" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusOrcamentoMaterialObra" NOT NULL DEFAULT 'RASCUNHO',
    "data_referencia" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "criado_por_id" TEXT,
    "aprovado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_material_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_orcamento_material_obra" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "categoria_material_id" TEXT,
    "quantidade_orcada" DECIMAL(15,3) NOT NULL,
    "custo_unitario_orcado" DECIMAL(15,4) NOT NULL,
    "custo_total_orcado" DECIMAL(15,2) NOT NULL,
    "etapa_obra" TEXT,
    "centro_custo_id" TEXT,
    "observacao" TEXT,

    CONSTRAINT "itens_orcamento_material_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apropriacoes_custo_estoque" (
    "id" TEXT NOT NULL,
    "movimento_estoque_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "centro_custo_id" TEXT,
    "categoria_id" TEXT,
    "material_id" TEXT NOT NULL,
    "quantidade" DECIMAL(15,3) NOT NULL,
    "custo_unitario" DECIMAL(15,4) NOT NULL,
    "custo_total" DECIMAL(15,2) NOT NULL,
    "data_competencia" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apropriacoes_custo_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_categorias_material_parent" ON "categorias_material"("parent_id");

-- CreateIndex
CREATE INDEX "idx_categorias_material_financeira" ON "categorias_material"("categoria_financeira_id");

-- CreateIndex
CREATE INDEX "idx_categorias_material_cc_padrao" ON "categorias_material"("centro_custo_padrao_id");

-- CreateIndex
CREATE UNIQUE INDEX "materiais_codigo_key" ON "materiais"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "materiais_codigo_barras_key" ON "materiais"("codigo_barras");

-- CreateIndex
CREATE INDEX "idx_materiais_categoria" ON "materiais"("categoria_material_id");

-- CreateIndex
CREATE INDEX "idx_materiais_ativo" ON "materiais"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "locais_estoque_codigo_key" ON "locais_estoque"("codigo");

-- CreateIndex
CREATE INDEX "idx_locais_estoque_obra" ON "locais_estoque"("obra_id");

-- CreateIndex
CREATE INDEX "idx_locais_estoque_tipo" ON "locais_estoque"("tipo");

-- CreateIndex
CREATE INDEX "idx_locais_estoque_ativo" ON "locais_estoque"("ativo");

-- CreateIndex
CREATE INDEX "idx_saldos_material" ON "saldos_estoque"("material_id");

-- CreateIndex
CREATE INDEX "idx_saldos_local" ON "saldos_estoque"("local_estoque_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_saldos_material_local" ON "saldos_estoque"("material_id", "local_estoque_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimentos_estoque_numero_key" ON "movimentos_estoque"("numero");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_material" ON "movimentos_estoque"("material_id");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_origem" ON "movimentos_estoque"("local_origem_id");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_destino" ON "movimentos_estoque"("local_destino_id");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_obra_data" ON "movimentos_estoque"("obra_id", "data_movimento");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_tipo" ON "movimentos_estoque"("tipo");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_status_data" ON "movimentos_estoque"("status", "data_movimento");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_fornecedor" ON "movimentos_estoque"("fornecedor_id");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_documento" ON "movimentos_estoque"("documento_numero");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_nf" ON "movimentos_estoque"("nota_fiscal_numero");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_destino_data" ON "movimentos_estoque"("local_destino_id", "data_movimento");

-- CreateIndex
CREATE INDEX "idx_movimentos_estoque_origem_data" ON "movimentos_estoque"("local_origem_id", "data_movimento");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_estoque_numero_key" ON "documentos_estoque"("numero");

-- CreateIndex
CREATE INDEX "idx_documentos_estoque_fornecedor" ON "documentos_estoque"("fornecedor_id");

-- CreateIndex
CREATE INDEX "idx_documentos_estoque_obra" ON "documentos_estoque"("obra_id");

-- CreateIndex
CREATE INDEX "idx_documentos_estoque_status" ON "documentos_estoque"("status");

-- CreateIndex
CREATE INDEX "idx_documentos_estoque_data" ON "documentos_estoque"("data_documento");

-- CreateIndex
CREATE INDEX "idx_documentos_estoque_documento_fiscal" ON "documentos_estoque"("documento_fiscal");

-- CreateIndex
CREATE INDEX "idx_itens_documento_material" ON "itens_documento_estoque"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_documento_material_lote" ON "itens_documento_estoque"("documento_estoque_id", "material_id", "lote");

-- CreateIndex
CREATE INDEX "idx_inventarios_estoque_local" ON "inventarios_estoque"("local_estoque_id");

-- CreateIndex
CREATE INDEX "idx_inventarios_estoque_status" ON "inventarios_estoque"("status");

-- CreateIndex
CREATE INDEX "idx_itens_inventario_material" ON "itens_inventario_estoque"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_inventario_material" ON "itens_inventario_estoque"("inventario_id", "material_id");

-- CreateIndex
CREATE INDEX "idx_reservas_material_local" ON "reservas_estoque"("material_id", "local_estoque_id");

-- CreateIndex
CREATE INDEX "idx_reservas_obra" ON "reservas_estoque"("obra_id");

-- CreateIndex
CREATE INDEX "idx_reservas_status" ON "reservas_estoque"("status");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_material_numero_key" ON "solicitacoes_material"("numero");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_material_obra" ON "solicitacoes_material"("obra_id");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_material_status" ON "solicitacoes_material"("status");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_material_necessidade" ON "solicitacoes_material"("data_necessidade");

-- CreateIndex
CREATE INDEX "idx_itens_solicitacao_material" ON "itens_solicitacao_material"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_solicitacao_material" ON "itens_solicitacao_material"("solicitacao_id", "material_id");

-- CreateIndex
CREATE INDEX "idx_orcamentos_material_status" ON "orcamentos_material_obra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_orcamentos_material_obra_versao" ON "orcamentos_material_obra"("obra_id", "versao");

-- CreateIndex
CREATE INDEX "idx_itens_orcamento_material" ON "itens_orcamento_material_obra"("material_id");

-- CreateIndex
CREATE INDEX "idx_itens_orcamento_categoria" ON "itens_orcamento_material_obra"("categoria_material_id");

-- CreateIndex
CREATE INDEX "idx_itens_orcamento_cc" ON "itens_orcamento_material_obra"("centro_custo_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_orcamento_material_etapa" ON "itens_orcamento_material_obra"("orcamento_id", "material_id", "etapa_obra");

-- CreateIndex
CREATE UNIQUE INDEX "apropriacoes_custo_estoque_movimento_estoque_id_key" ON "apropriacoes_custo_estoque"("movimento_estoque_id");

-- CreateIndex
CREATE INDEX "idx_apropriacoes_estoque_obra_data" ON "apropriacoes_custo_estoque"("obra_id", "data_competencia");

-- CreateIndex
CREATE INDEX "idx_apropriacoes_estoque_cc" ON "apropriacoes_custo_estoque"("centro_custo_id");

-- CreateIndex
CREATE INDEX "idx_apropriacoes_estoque_categoria" ON "apropriacoes_custo_estoque"("categoria_id");

-- CreateIndex
CREATE INDEX "idx_apropriacoes_estoque_material" ON "apropriacoes_custo_estoque"("material_id");

-- AddForeignKey
ALTER TABLE "categorias_material" ADD CONSTRAINT "categorias_material_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categorias_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_material" ADD CONSTRAINT "categorias_material_categoria_financeira_id_fkey" FOREIGN KEY ("categoria_financeira_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_material" ADD CONSTRAINT "categorias_material_centro_custo_padrao_id_fkey" FOREIGN KEY ("centro_custo_padrao_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiais" ADD CONSTRAINT "materiais_categoria_material_id_fkey" FOREIGN KEY ("categoria_material_id") REFERENCES "categorias_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiais" ADD CONSTRAINT "materiais_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais_estoque" ADD CONSTRAINT "locais_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais_estoque" ADD CONSTRAINT "locais_estoque_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_estoque" ADD CONSTRAINT "saldos_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_estoque" ADD CONSTRAINT "saldos_estoque_local_estoque_id_fkey" FOREIGN KEY ("local_estoque_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_local_origem_id_fkey" FOREIGN KEY ("local_origem_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_local_destino_id_fkey" FOREIGN KEY ("local_destino_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_movimento_relacionado_id_fkey" FOREIGN KEY ("movimento_relacionado_id") REFERENCES "movimentos_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_documento_estoque_id_fkey" FOREIGN KEY ("documento_estoque_id") REFERENCES "documentos_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_transacao_financeira_id_fkey" FOREIGN KEY ("transacao_financeira_id") REFERENCES "lancamentos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_local_origem_id_fkey" FOREIGN KEY ("local_origem_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_local_destino_id_fkey" FOREIGN KEY ("local_destino_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_transacao_financeira_id_fkey" FOREIGN KEY ("transacao_financeira_id") REFERENCES "lancamentos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_estoque" ADD CONSTRAINT "documentos_estoque_efetivado_por_id_fkey" FOREIGN KEY ("efetivado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_documento_estoque" ADD CONSTRAINT "itens_documento_estoque_documento_estoque_id_fkey" FOREIGN KEY ("documento_estoque_id") REFERENCES "documentos_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_documento_estoque" ADD CONSTRAINT "itens_documento_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios_estoque" ADD CONSTRAINT "inventarios_estoque_local_estoque_id_fkey" FOREIGN KEY ("local_estoque_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios_estoque" ADD CONSTRAINT "inventarios_estoque_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios_estoque" ADD CONSTRAINT "inventarios_estoque_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_inventario_estoque" ADD CONSTRAINT "itens_inventario_estoque_inventario_id_fkey" FOREIGN KEY ("inventario_id") REFERENCES "inventarios_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_inventario_estoque" ADD CONSTRAINT "itens_inventario_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_local_estoque_id_fkey" FOREIGN KEY ("local_estoque_id") REFERENCES "locais_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_material" ADD CONSTRAINT "solicitacoes_material_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_material" ADD CONSTRAINT "solicitacoes_material_local_destino_id_fkey" FOREIGN KEY ("local_destino_id") REFERENCES "locais_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_material" ADD CONSTRAINT "solicitacoes_material_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_material" ADD CONSTRAINT "solicitacoes_material_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_solicitacao_material" ADD CONSTRAINT "itens_solicitacao_material_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_solicitacao_material" ADD CONSTRAINT "itens_solicitacao_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_material_obra" ADD CONSTRAINT "orcamentos_material_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_material_obra" ADD CONSTRAINT "orcamentos_material_obra_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos_material_obra" ADD CONSTRAINT "orcamentos_material_obra_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento_material_obra" ADD CONSTRAINT "itens_orcamento_material_obra_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos_material_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento_material_obra" ADD CONSTRAINT "itens_orcamento_material_obra_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento_material_obra" ADD CONSTRAINT "itens_orcamento_material_obra_categoria_material_id_fkey" FOREIGN KEY ("categoria_material_id") REFERENCES "categorias_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento_material_obra" ADD CONSTRAINT "itens_orcamento_material_obra_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apropriacoes_custo_estoque" ADD CONSTRAINT "apropriacoes_custo_estoque_movimento_estoque_id_fkey" FOREIGN KEY ("movimento_estoque_id") REFERENCES "movimentos_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apropriacoes_custo_estoque" ADD CONSTRAINT "apropriacoes_custo_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apropriacoes_custo_estoque" ADD CONSTRAINT "apropriacoes_custo_estoque_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apropriacoes_custo_estoque" ADD CONSTRAINT "apropriacoes_custo_estoque_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apropriacoes_custo_estoque" ADD CONSTRAINT "apropriacoes_custo_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

