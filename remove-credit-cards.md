# Plano de Tarefa: Remover Módulo de Cartões de Crédito

## Objetivo
Remover completamente o módulo de "Cartões de Crédito" e todas as suas referências no banco de dados (Prisma), backend (NestJS) e frontend (Angular).

## Tarefas

- [x] **Tarefa 1: Navegação do Frontend**
  - Remover o item de menu "Cartões de Crédito" de `frontend/src/app/app.component.html`.
  - Verificação: Inspecionar o HTML para garantir que o link foi removido.

- [x] **Tarefa 2: Rotas e Páginas do Frontend**
  - Remover as rotas `credit-card-list` e `credit-card-review` de `frontend/src/app/app.routes.ts`.
  - Deletar as pastas `frontend/src/app/financial/credit-card-list` e `frontend/src/app/financial/credit-card-review`.
  - Verificação: Garantir que o frontend compila sem erros de importação.

- [x] **Tarefa 3: Módulos do Backend**
  - Remover a importação de `CreditCardsModule` em `backend/src/app.module.ts`.
  - Deletar a pasta `backend/src/financial/credit-cards`.
  - Verificação: `npx tsc --noEmit` no backend não apresenta falhas de módulo.

- [x] **Tarefa 4: Schema e Relacionamentos do Prisma**
  - Remover os modelos `FaturaCartao`, `CartaoTransacao`, `RateioCartaoTransacao` e enums associados no `backend/prisma/schema.prisma`.
  - Remover referências a cartões em `LancamentoFinanceiro`, `Cliente`, `CategoriaFinanceira` e `CentroCusto`.
  - Verificação: `npx prisma validate` executa com sucesso.

- [x] **Tarefa 5: Migrações e Prisma Client**
  - Gerar a migration do Prisma com `npx prisma migrate dev --name remove_credit_cards` (ou equivalente no backend).
  - Verificação: Nova migration criada em `prisma/migrations`.

- [x] **Tarefa 6: Verificação Final e Testes**
  - Rodar o script de checagem do projeto (`python .agent/scripts/checklist.py .`).
  - Verificação: Todos os checks passando com sucesso.

## Done When
- O frontend e o backend compilam perfeitamente sem erros de build.
- O menu lateral não exibe a opção de Cartões de Crédito.
- As tabelas foram removidas do banco de dados sem quebrar o histórico financeiro restante.
