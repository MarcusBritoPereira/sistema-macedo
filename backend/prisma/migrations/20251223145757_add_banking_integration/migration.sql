-- CreateEnum
CREATE TYPE "StatusIntegracao" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "integracoes_bancarias" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "apiKey" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "crtFile" TEXT,
    "keyFile" TEXT,
    "status" "StatusIntegracao" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSync" TIMESTAMP(3),
    "contaBancariaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_bancarias_contaBancariaId_key" ON "integracoes_bancarias"("contaBancariaId");

-- AddForeignKey
ALTER TABLE "integracoes_bancarias" ADD CONSTRAINT "integracoes_bancarias_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
