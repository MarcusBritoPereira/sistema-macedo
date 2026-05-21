-- CreateEnum
CREATE TYPE "StatusObra" AS ENUM ('PLANEJAMENTO', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "lancamentos_financeiros" ADD COLUMN     "obraId" TEXT;

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataPrevisaoFim" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "status" "StatusObra" NOT NULL DEFAULT 'PLANEJAMENTO',
    "orcamentoPrevisto" DECIMAL(10,2),
    "endereco" TEXT,
    "clienteId" TEXT,
    "centroCustoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

