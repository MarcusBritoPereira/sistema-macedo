# Auditoria arquitetural — Fase 2: Controle de Estoque

Data: 2026-07-16
Repositório auditado: `/workspace/sistema-macedo`

> Este documento atende à Etapa 1 solicitada antes de iniciar codificação funcional. Nenhuma migration ou implementação de estoque foi criada nesta etapa.

## 1. Stack atual

### Backend

- NestJS 11 com módulos, controllers, services e DTOs.
- Prisma ORM 5 com PostgreSQL.
- Redis via `ioredis`, hoje usado principalmente para sessões de refresh token.
- Autenticação com Passport JWT, cookies HTTP-only e refresh token.
- Validação de DTOs com `class-validator` e `class-transformer`.
- Agendamento com `@nestjs/schedule` e rate limit com `@nestjs/throttler`.

### Frontend

- Angular 20 com rotas standalone/lazy `loadComponent`.
- Ionic Angular 8 para shell, menu, cards, forms e layout responsivo.
- Capacitor 8 configurado para uso mobile.
- Chart.js/ng2-charts para dashboards.
- Serviços HTTP organizados em `src/app/services`.

### Infraestrutura

- Docker Compose local com PostgreSQL 15 Alpine e Redis 7 Alpine.
- Docker Compose de produção com PostgreSQL, Redis, backend, frontend, healthchecks e volumes persistentes.
- Nginx no frontend em container próprio.

## 2. Estrutura Prisma existente

O schema atual é monolítico em `backend/prisma/schema.prisma` e mapeia nomes físicos em português com `@@map`.

Modelos já existentes e reutilizáveis:

- `Usuario` e `Perfil` para usuários, perfis e permissões em JSON.
- `Cliente`, `Fornecedor` e `Contrato` para cadastros comerciais.
- `LancamentoFinanceiro`, `ContaBancaria`, `CategoriaFinanceira`, `CentroCusto`, `RateioLancamento` e `RateioHistorico` para o financeiro.
- `Obra` e `ParcelaObra` para obras e parcelas.
- `LogAuditoria` para trilha de auditoria.
- `DreCache`, `RegraClassificacao`, `Recurrencia`, `ExtratoBancario`, `ConciliacaoBancaria` e `ImportacaoBancaria` para relatórios, automação e conciliação.

Padrões observados:

- IDs são `String @id @default(uuid())`.
- Datas usam `createdAt @default(now())` e `updatedAt @updatedAt`.
- Valores financeiros usam `Decimal @db.Decimal(10, 2)`; rateio já usa quantidade `Decimal @db.Decimal(12, 3)`.
- Índices são declarados no Prisma com nomes explícitos em vários pontos.
- Tabelas físicas usam plural em português via `@@map`.

## 3. Padrão backend atual

### Modules

Cada domínio possui um módulo NestJS próprio, por exemplo `FinancialModule`, `UsersModule`, `SuppliersModule`, `AuditLogModule`, `HealthModule`.

### Controllers

- Rotas REST com prefixos como `financial/transactions`, `financial/categories`, `suppliers`.
- Guards aplicados no controller, principalmente `AuthGuard('jwt')`, `RolesGuard` e, onde existir, `PermissionsGuard`.
- Paginação via query `skip` e `take`, com normalização defensiva em controllers financeiros.

### Services

- Regras de negócio ficam nos services.
- Persistência direta via `PrismaService`.
- Operações financeiras já registram auditoria em alguns fluxos, mas a cobertura não é uniforme.

### DTOs

- DTOs usam `class-validator`.
- `PartialType` é usado em DTOs de update em vários módulos.
- Atenção: alguns DTOs financeiros ainda aceitam `number` para valor na borda HTTP; a Fase 2 deve converter para `Decimal` com cuidado antes de persistir.

## 4. Autenticação e autorização

- Login em `/auth/login` cria cookies HTTP-only `access_token` e `refresh_token`.
- JWT inclui `sub`, `username` e `role`.
- Refresh tokens são validados por sessão Redis.
- `RolesGuard` compara roles declaradas por decorator `@Roles` com `req.user.role`.
- `PermissionsGuard` compara permissões declaradas por decorator `@Permissions` contra `req.user.permissions`.
- No frontend, há `AuthGuard`, `RestrictedFinancialGuard` e menu controlado por `auth.hasPermission(...)`.

Risco identificado: existe dualidade entre autorização por perfil/role e permissões granulares JSON. O estoque deve preferir permissões granulares, mas manter compatibilidade com perfis existentes.

## 5. Entidades existentes para reaproveitamento

### Obras

- `Obra` já existe e deve ser reutilizada para locais de estoque vinculados à obra, consumo por obra, orçamento de materiais e apropriação de custos.
- `StatusObra` deve ser validado para impedir movimentações em obras inativas/concluídas/canceladas, conforme regra final do negócio.

### Centros de custo

- `CentroCusto` já existe e deve ser reutilizado em categorias de materiais, saídas de consumo, perdas e apropriações.
- Há relacionamento com responsável (`Usuario`) e plano de conta (`CategoriaFinanceira`).

### Categorias financeiras

- `CategoriaFinanceira` é hierárquica e distingue `RECEITA`/`DESPESA`.
- Para estoque, recomenda-se criar `CategoriaMaterial` própria com vínculo opcional a `CategoriaFinanceira` e `CentroCusto`, em vez de reutilizar diretamente categoria financeira como categoria de material. Isso evita misturar taxonomia operacional com plano financeiro.

### Usuários/perfis

- `Usuario`, `Perfil` e permissões JSON devem ser reaproveitados.
- Permissões de estoque devem ser seedadas idempotentemente nos perfis/usuários sem sobrescrever permissões manuais.

### Fornecedores

- `Fornecedor` já existe e deve ser vinculado a documentos/entradas de estoque. Não criar cadastro paralelo.

### Movimentações financeiras

- `LancamentoFinanceiro` representa contas a pagar/receber, caixa/competência e vínculos com fornecedor, obra, categoria e centro de custo.
- `RateioLancamento` já guarda detalhamento por obra/centro/categoria e campos de materialidade (`tipoCusto`, quantidade, valor unitário), mas não é uma entidade independente de apropriação operacional.

## 6. Integração financeira recomendada

### Entrada de compra

- Criar `DocumentoEstoque` com `fornecedorId`, `notaFiscalNumero`, `valorTotal` e vínculo opcional a `LancamentoFinanceiro`.
- Se o lançamento financeiro já existir, apenas vincular e validar duplicidade por fornecedor + nota fiscal + valor + competência.
- Se nascer no estoque, criar `LancamentoFinanceiro` `DESPESA` com status adequado ao fluxo atual (`PREVISTO` ou `REALIZADO`) e vínculos de fornecedor/categoria/centro/obra.

### Saída/consumo em obra

- Não criar nova saída de caixa automaticamente, pois o pagamento pode já ter sido registrado na compra.
- Criar entidade nova `ApropriacaoCustoEstoque` para custo operacional apropriado, vinculada a `MovimentoEstoque`, `Obra`, `CentroCusto`, `CategoriaFinanceira`, `Material` e valores.
- Relatórios gerenciais devem somar apropriação de estoque com cuidado para não duplicar DRE/caixa. Uma integração com DRE deve ser explicitamente desenhada para separar caixa de consumo.

## 7. Auditoria e logs atuais

- `LogAuditoria` existe e `AuditLogService.createLog` registra ação, tabela, registro, valor antigo, valor novo, motivo e usuário.
- Não há campos explícitos no serviço atual para IP e User-Agent, exigidos pela Fase 2. Há duas opções:
  1. evoluir `LogAuditoria` com campos opcionais `ip` e `userAgent`; ou
  2. armazenar esses dados em JSON nos valores/motivo.
- Recomendação: migration não destrutiva adicionando campos opcionais para IP e User-Agent.

## 8. Convenções visuais e frontend

- Shell principal usa `ion-app`, `ion-split-pane`, `ion-menu`, `ion-accordion`, `ion-item`, `ion-icon` e permissões no template.
- Dashboards usam cartões, painéis, tabelas e gráficos em CSS próprio por página.
- CRUDs seguem páginas standalone com serviços por domínio.
- Componentes reutilizáveis relevantes:
  - `quick-create-modal`.
  - `rateio-modal`.
  - `searchable-selection-modal`.
  - `transaction-modal`.
  - `import-modal`.
- Para estoque, recomenda-se criar páginas em `frontend/src/app/stock/...` e serviço em `frontend/src/app/services/stock/stock.service.ts`, seguindo lazy routes e Ionic.

## 9. Feature flag

- Não foi encontrado mecanismo central de feature flags.
- Backend deve registrar `StockModule` no `AppModule` apenas se `STOCK_MODULE_ENABLED === 'true'`, ou aplicar guard que bloqueie todas as rotas quando desativado.
- Frontend deve ocultar menu e rotas visíveis quando `environment.stockModuleEnabled` ou configuração equivalente estiver falsa.

## 10. Entidades novas propostas

Entidades de domínio:

- `Material`.
- `CategoriaMaterial`.
- `LocalEstoque`.
- `SaldoEstoque`.
- `MovimentoEstoque`.
- `DocumentoEstoque`.
- `ItemDocumentoEstoque`.
- `InventarioEstoque`.
- `ItemInventarioEstoque`.
- `ReservaEstoque`.
- `SolicitacaoMaterial`.
- `ItemSolicitacaoMaterial`.
- `OrcamentoMaterialObra`.
- `ItemOrcamentoMaterialObra`.
- `ApropriacaoCustoEstoque`.
- Opcional: `AlertaEstoque` se não houver central de notificações reaproveitável.

Enums novos sugeridos:

- `UnidadeMedidaMaterial` ou tabela `UnidadeMedida`, dependendo da necessidade de cadastro dinâmico. Pela simplicidade atual do Prisma, enum atende a primeira entrega; tabela pode ser necessária se o cliente cadastrar novas unidades.
- `TipoLocalEstoque`.
- `TipoMovimentoEstoque`.
- `StatusMovimentoEstoque`.
- `TipoDocumentoEstoque`.
- `StatusDocumentoEstoque`.
- `StatusReservaEstoque`.
- `StatusSolicitacaoMaterial`.
- `PrioridadeSolicitacaoMaterial`.
- `StatusInventarioEstoque`.
- `StatusOrcamentoMaterialObra`.
- `StatusAlertaEstoque`.

## 11. Plano de migrations

Migration 1 — domínio base:

- Criar enums de estoque.
- Criar tabelas de categorias de material, materiais, locais e saldos.
- Criar índices únicos de código e `materialId + localEstoqueId`.

Migration 2 — movimentações e documentos:

- Criar documentos, itens e movimentos.
- Criar vínculos opcionais com `Fornecedor`, `Obra`, `Usuario`, `LancamentoFinanceiro`.
- Criar índices de tipo/status/data/material/local/obra/fornecedor/documento/nota fiscal.

Migration 3 — integração gerencial:

- Criar `ApropriacaoCustoEstoque`.
- Criar vínculo com centro de custo e categoria financeira.

Migration 4 — solicitações, reservas e inventário:

- Criar solicitações, itens, reservas, inventários e itens.

Migration 5 — orçamento e alertas:

- Criar orçamento de materiais por obra, itens e alertas.

Migration 6 — auditoria complementar:

- Adicionar campos opcionais `ip` e `userAgent` a `LogAuditoria`, se aprovado.

Todas as migrations devem ser aditivas, sem `DROP`, `TRUNCATE`, reset ou alteração destrutiva de dados existentes.

## 12. Arquivos previstos para alteração nas próximas etapas

Backend:

- `backend/prisma/schema.prisma`.
- `backend/prisma/migrations/.../migration.sql`.
- `backend/prisma/seed.ts`.
- `backend/src/app.module.ts`.
- `backend/src/audit-log/audit-log.service.ts`.
- `backend/src/stock/stock.module.ts`.
- `backend/src/stock/**` para controllers, services e DTOs.
- `backend/src/auth/permissions.guard.ts` e/ou seeds de permissões, se necessário.
- Testes em `backend/src/stock/**/*.spec.ts` e `backend/test/**/*.e2e-spec.ts`.

Frontend:

- `frontend/src/app/app.routes.ts`.
- `frontend/src/app/app.component.html` e estilos associados ao menu.
- `frontend/src/app/services/stock/**`.
- `frontend/src/app/stock/**`.
- `frontend/src/environments/**`, se a estrutura de environments for reativada/normalizada.

Infra/documentação:

- `.env.example`, se existir ou for criado.
- `docker-compose.prod.yml` para variável `STOCK_MODULE_ENABLED`.
- `docs/` para API, deploy, rollback e manual do usuário.

## 13. Riscos e decisões pendentes

1. **Escopo grande para uma única entrega**: recomenda-se implementar em PRs menores por etapa.
2. **Sem feature flag central atual**: criar padrão simples sem introduzir biblioteca externa.
3. **Autorização híbrida**: consolidar permissões de estoque sem quebrar roles atuais.
4. **Decimal na borda HTTP**: padronizar conversão para evitar erros de arredondamento.
5. **Concorrência de estoque**: usar transação Prisma com isolamento serializável e/ou `SELECT ... FOR UPDATE` em saldos.
6. **Apropriação versus caixa**: criar entidade própria de apropriação para evitar duplicidade financeira.
7. **Auditoria incompleta para IP/User-Agent**: schema precisa evolução aditiva.
8. **Relatórios pesados**: usar agregações SQL/Prisma e paginação desde a primeira versão.
9. **Mobile no canteiro**: priorizar fluxos de solicitação, saída, recebimento e consulta com Ionic responsivo.

## 14. Próxima etapa proposta

Após aprovação deste diagnóstico, iniciar a Etapa 2 com um PR contendo apenas:

- schema Prisma e migration base de estoque;
- module backend vazio protegido por feature flag;
- serviços centrais de cálculo de custo médio e movimentação com testes unitários;
- seed idempotente das permissões de estoque.
