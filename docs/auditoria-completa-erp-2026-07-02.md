# Auditoria completa do Sistema Macedo — ERP comercial

Data: 2026-07-02
Escopo: backend NestJS/Prisma/PostgreSQL, frontend Angular/Ionic, DevOps, segurança, UX, dados e roadmap.

## 1. Relatório executivo

O Sistema Macedo já possui uma base promissora para um ERP financeiro/operacional: autenticação JWT em cookies HTTP-only, NestJS modular, Prisma com PostgreSQL, Angular/Ionic com rotas lazy-loaded, módulos de clientes, fornecedores, contratos, financeiro, DRE, fluxo de caixa, conciliação, contas bancárias, centros de custo, obras, auditoria e integração bancária.

O principal risco não é falta de funcionalidade inicial, mas maturidade comercial: arquivos muito grandes, regras de negócio concentradas em services e pages, permissões inconsistentes entre módulos, pouca cobertura de testes, ausência de OpenAPI/Swagger, scripts soltos na raiz, logging com `console`, poucos controles formais de observabilidade, backup, CI/CD e governança de dados.

Recomendação executiva: antes de adicionar grandes módulos, estabilizar segurança, qualidade, testes, documentação de API, padronização visual e modularização do financeiro. Em seguida evoluir para recursos de ERP premium: conciliação robusta, fechamento mensal, DRE gerencial, fluxo de caixa projetado, aprovações, anexos seguros, relatórios exportáveis, trilha de auditoria completa, multiempresa e IA aplicada a financeiro.

## 2. Pontos excelentes

- Backend usa NestJS, módulos por domínio, Prisma e PostgreSQL, uma escolha boa para manutenção e escalabilidade inicial.
- O bootstrap já aplica Helmet, CORS controlado, ValidationPipe com whitelist/forbidNonWhitelisted/transform, request id e interceptor global de log.
- Autenticação usa cookies HTTP-only para access/refresh token e rotação de refresh token com sessão Redis.
- Prisma já define modelos relevantes para ERP financeiro: usuário, perfil, cliente, contrato, lançamento financeiro, banco, extrato, conciliação, categoria, centro de custo, orçamento, obra, rateio, recorrência, fornecedor e auditoria.
- O frontend já usa rotas lazy-loaded por tela, reduzindo bundle inicial.
- Há módulos avançados em andamento: DRE, fluxo de caixa, conciliação bancária, integração bancária, rateio, obras e relatórios.
- Uploads bancários possuem limite de tamanho e validação de extensão para CSV/OFX.
- Existem migrations incrementais e índices financeiros relevantes para lançamentos e extratos.

## 3. Diagnóstico arquitetural

### Problema A1 — Services e componentes grandes demais

**Descrição detalhada:** Há arquivos de 700 a 1.355 linhas em services e componentes, especialmente `financial-dashboard.service.ts`, `banking-integration.service.ts`, `reconciliation.service.ts`, `reports.service.ts`, `reconciliation-detail.component.ts/html/scss`, `reconciliation.page.ts/scss`, `financial-list.page.ts/scss` e telas financeiras. Isso indica baixa coesão, mistura de cálculo, persistência, formatação, orquestração e apresentação.

**Impacto:** Dificulta teste unitário, revisão, onboarding, performance de build, correção segura de bugs e evolução por equipe. A chance de regressão cresce muito em módulos financeiros.

**Solução:** Quebrar em use cases, query services, mappers, presenters/view-models e componentes menores. Criar subpastas `application`, `domain`, `infra`, `dto`, `mappers`, `queries` para financeiro. No frontend, extrair tabelas, cards, filtros, empty states, chart widgets e modais.

**Prioridade:** Alta.
**Tempo estimado:** 10 a 15 dias.
**Benefício esperado:** Redução de regressões, testes mais simples, evolução paralela e base preparada para features comerciais.

### Problema A2 — Organização de scripts e arquivos soltos

**Descrição detalhada:** Há scripts e documentos operacionais na raiz e no backend (`patch.js`, `add_caixinha.js`, `rename_sicredi.js`, `ssh_run.py`, `deploy_to_production.sh`, debug banking files, scripts Prisma diversos). Alguns parecem hotfixes manuais e utilitários de produção.

**Impacto:** Aumenta risco operacional, confusão de responsabilidade e execução acidental. Em ERP financeiro, scripts manuais podem causar perda ou corrupção de dados.

**Solução:** Mover para `tools/`, `scripts/ops/`, `scripts/data-migrations/` e documentar. Scripts destrutivos devem exigir confirmação explícita, dry-run e auditoria. Remover arquivos debug do build de produção.

**Prioridade:** Alta.
**Tempo estimado:** 2 a 4 dias.
**Benefício esperado:** Operação mais segura e repositório mais profissional.

### Problema A3 — Falta de camada Repository/Use Case explícita

**Descrição detalhada:** Controllers chamam services que acessam Prisma diretamente. Em módulos simples isso é aceitável, mas financeiro possui regras, auditoria, conciliação, recorrência, rateio e relatórios.

**Impacto:** Regras de negócio ficam acopladas ao ORM; trocar queries, testar regras sem banco e aplicar políticas transversais fica mais difícil.

**Solução:** Introduzir gradualmente use cases por operação crítica (`CreateTransactionUseCase`, `ReconcileStatementUseCase`, `GenerateDreUseCase`) e query repositories para relatórios. Não precisa reescrever tudo; começar pelos fluxos financeiros críticos.

**Prioridade:** Média/Alta.
**Tempo estimado:** 15 a 25 dias.
**Benefício esperado:** Domínio mais limpo, testes melhores e menor acoplamento.

## 4. Backend/API

### Problema B1 — Validação de query params insuficiente

**Descrição detalhada:** Endpoints recebem query params diretamente em controllers (`type`, `status`, datas, paginação, busca). Há normalização manual de `skip/take`, mas faltam DTOs de filtro com `class-validator`, validação de enum, datas e limites por endpoint.

**Impacto:** Possíveis erros 500 por enum inválido, filtros inconsistentes, queries caras e comportamento imprevisível.

**Solução:** Criar DTOs como `FindTransactionsQueryDto`, `PaginationDto`, `DateRangeDto` com `@IsEnum`, `@IsDateString`, `@Min`, `@Max`, `@IsOptional`; padronizar resposta `{data, meta}`.

**Prioridade:** Alta.
**Tempo estimado:** 2 a 4 dias.
**Benefício esperado:** API previsível, menos bugs e base para OpenAPI.

### Problema B2 — Permissões inconsistentes

**Descrição detalhada:** Parte dos endpoints usa `RolesGuard` com roles fixas (`ADMIN`, `FINANCEIRO`), outra parte usa `PermissionsGuard` com permissões granulares. O frontend tem lógica própria de permissão, com compatibilidade legada.

**Impacto:** Risco de divergência entre UI e backend; usuário pode ver/ocultar ações indevidamente. Segurança depende de disciplina por endpoint.

**Solução:** Definir matriz RBAC/ABAC única. Padronizar backend com `RequirePermissions` em todos os recursos críticos e usar roles apenas como agregadores. Expor endpoint `/auth/capabilities` para o frontend.

**Prioridade:** Crítica.
**Tempo estimado:** 5 a 8 dias.
**Benefício esperado:** Menos IDOR/autorização quebrada e controle comercial por perfil.

### Problema B3 — Logging com console e sem observabilidade

**Descrição detalhada:** Há logs estruturados no bootstrap, mas services críticos ainda usam `console.log/error`, inclusive integração bancária e cron.

**Impacto:** Logs ficam ruidosos, difíceis de consultar, sem correlação por request e podem vazar detalhes sensíveis.

**Solução:** Adotar `Logger` do Nest ou Pino/Winston com redaction. Incluir requestId, userId, tenantId futuro, módulo, operação e latência. Proibir logs de secrets, tokens, certificados e payloads sensíveis.

**Prioridade:** Alta.
**Tempo estimado:** 3 a 5 dias.
**Benefício esperado:** Diagnóstico profissional, auditoria e menor risco de vazamento.

### Problema B4 — Tratamento de erros não padronizado

**Descrição detalhada:** Services misturam `BadRequestException`, `NotFoundException`, relançamento de erro bruto e retorno de entidades Prisma. Falta filtro global de exceções com formato consistente.

**Impacto:** Frontend precisa tratar muitos formatos; mensagens internas podem vazar.

**Solução:** Criar `GlobalExceptionFilter`, códigos de erro (`FIN_TRANSACTION_NOT_FOUND`), mensagens amigáveis e logging interno separado da resposta pública.

**Prioridade:** Alta.
**Tempo estimado:** 3 a 5 dias.
**Benefício esperado:** UX melhor, API mais profissional e suporte mais rápido.

### Problema B5 — Falta Swagger/OpenAPI

**Descrição detalhada:** Não há documentação OpenAPI gerada pelo backend.

**Impacto:** Integrações, QA, frontend e clientes enterprise ficam dependentes do código.

**Solução:** Adicionar `@nestjs/swagger`, decorators nos DTOs, autenticação cookie/JWT documentada e publicar `/docs` restrito por ambiente.

**Prioridade:** Alta.
**Tempo estimado:** 4 a 7 dias.
**Benefício esperado:** Integração mais rápida e API comercialmente apresentável.

## 5. Banco de dados

### Problema D1 — Constraints de integridade incompletas

**Descrição detalhada:** A modelagem é rica, mas vários campos aceitam nulo em relações críticas (`categoriaId`, `centroCustoId`, `contaBancariaId`, `clienteId`, `fornecedorId`). Em ERP, a obrigatoriedade depende do tipo/status, mas precisa estar formalizada.

**Impacto:** DRE, fluxo de caixa e relatórios podem ficar incompletos ou incorretos por lançamentos sem classificação.

**Solução:** Criar políticas de integridade por status: lançamento realizado precisa conta bancária; despesa precisa categoria; obra/pós-obra precisa obra; receita pode exigir cliente/contrato em certos fluxos. Implementar validação no service e, quando possível, constraints/checks SQL em migrations.

**Prioridade:** Crítica.
**Tempo estimado:** 5 a 10 dias.
**Benefício esperado:** Relatórios financeiros confiáveis.

### Problema D2 — Permissões em JSON sem modelo normalizado

**Descrição detalhada:** `Perfil.permissoes` e `Usuario.permissoes` usam JSON. É flexível, mas limita auditoria, consultas e governança.

**Impacto:** Difícil saber quem tem acesso a quê, histórico de alteração e segregação de funções.

**Solução:** Evoluir para tabelas `permissoes`, `perfil_permissoes`, `usuario_permissoes_override`, mantendo JSON apenas como compatibilidade temporária.

**Prioridade:** Alta.
**Tempo estimado:** 8 a 12 dias.
**Benefício esperado:** Controle enterprise de acesso.

### Problema D3 — Índices bons, mas falta estratégia de crescimento

**Descrição detalhada:** Há índices em lançamentos/extratos, porém faltam índices compostos por período/status em outros módulos, índices por `ativo`, `createdAt`, `updatedAt`, busca textual e particionamento/arquivamento para tabelas grandes.

**Impacto:** Com milhares/milhões de lançamentos, buscas e dashboards podem ficar lentos.

**Solução:** Medir com `EXPLAIN ANALYZE`; criar índices por queries reais; considerar materialized views para dashboard/DRE e particionamento por ano para extratos/lancamentos em grande escala.

**Prioridade:** Média/Alta.
**Tempo estimado:** 5 a 15 dias.
**Benefício esperado:** Escalabilidade para 5.000+ usuários e alto volume financeiro.

### Problema D4 — Conciliação 1:1 rígida

**Descrição detalhada:** `ConciliacaoBancaria` usa `@unique` em lançamento e extrato, impedindo cenários comuns de N:1 ou 1:N (um pagamento para várias notas, tarifas agrupadas, split de recebíveis).

**Impacto:** Conciliação real de banco/cartão/PIX fica limitada.

**Solução:** Redesenhar conciliação com cabeçalho e itens: `conciliacao` + `conciliacao_lancamentos` + `conciliacao_extratos`, com valores conciliados parciais.

**Prioridade:** Alta.
**Tempo estimado:** 8 a 15 dias.
**Benefício esperado:** Conciliação bancária de padrão ERP.

## 6. Frontend, UI e UX

### Problema F1 — Páginas e SCSS muito grandes

**Descrição detalhada:** Telas financeiras e de conciliação concentram muito estado, template e CSS. Isso sinaliza componentes pesados, difícil manutenção e risco de renders desnecessários.

**Impacto:** UX pode degradar em listas grandes; manutenção visual fica cara.

**Solução:** Criar design system interno com tokens, componentes reutilizáveis (`DataTable`, `FilterBar`, `KpiCard`, `MoneyCell`, `StatusBadge`, `EmptyState`, `ConfirmDialog`). Usar `OnPush`, `trackBy`, virtual scroll em listas grandes e signals/store para estados complexos.

**Prioridade:** Alta.
**Tempo estimado:** 10 a 20 dias.
**Benefício esperado:** Interface consistente, performance e produtividade.

### Problema F2 — Permissões duplicadas no frontend

**Descrição detalhada:** O frontend calcula permissões com lógica própria e compatibilidade legada.

**Impacto:** UI pode divergir do backend; ações podem aparecer ou sumir incorretamente.

**Solução:** Consumir capabilities vindas do backend e criar diretiva `*hasPermission` padronizada.

**Prioridade:** Alta.
**Tempo estimado:** 3 a 5 dias.
**Benefício esperado:** Menos bugs de acesso e UX mais previsível.

### Problema F3 — Falta de padrões de feedback e estados

**Descrição detalhada:** É necessário padronizar loading, skeleton, toast, empty state, erro recuperável, confirmação destrutiva, salvamento otimista e mensagens por campo.

**Impacto:** Sistema parece menos profissional e aumenta erro operacional.

**Solução:** Criar biblioteca compartilhada de feedback visual e guidelines de microcopy.

**Prioridade:** Média/Alta.
**Tempo estimado:** 5 a 8 dias.
**Benefício esperado:** Percepção de qualidade comercial e redução de suporte.

### Problema F4 — Acessibilidade não evidenciada

**Descrição detalhada:** Falta checklist formal de contraste, navegação por teclado, labels ARIA, foco, leitores de tela, mensagens de erro acessíveis.

**Impacto:** Menor inclusão e risco em clientes corporativos.

**Solução:** Auditar telas com Lighthouse/axe; criar padrões de componentes acessíveis; garantir foco em modais e formulários.

**Prioridade:** Média.
**Tempo estimado:** 5 a 10 dias.
**Benefício esperado:** UX inclusiva e maior maturidade enterprise.

## 7. Dashboard

### Diagnóstico

O dashboard financeiro é um módulo importante, mas precisa evoluir de “painel informativo” para “cockpit de gestão”. O arquivo de serviço do dashboard é grande, indicando concentração de cálculos e risco de performance conforme os dados crescem.

### Indicadores recomendados

- Receita diária, mensal, anual e comparativo YoY/MoM.
- Despesa diária, mensal, anual.
- Lucro operacional e margem operacional.
- Fluxo de caixa realizado, previsto e projetado.
- Saldo por conta bancária.
- Contas a pagar vencidas/vencendo em 7/15/30 dias.
- Contas a receber vencidas/vencendo.
- Inadimplência por cliente, faixa de atraso e valor em aberto.
- Top clientes por receita e margem.
- Top fornecedores por gasto.
- Top categorias/centros de custo.
- DRE resumida com drilldown.
- Aging de recebíveis e pagáveis.
- Alertas inteligentes: queda de receita, gasto fora do padrão, duplicidade, saldo insuficiente, contrato sem cobrança.
- Widgets personalizáveis por perfil.

### Problema DASH1 — Cálculo possivelmente síncrono e centralizado

**Impacto:** Dashboard pode ficar lento e caro no banco.
**Solução:** Criar materialized views/caches por período, jobs de atualização, endpoint por widget e cache invalidado por alteração financeira.
**Prioridade:** Alta.
**Tempo estimado:** 8 a 12 dias.
**Benefício esperado:** Dashboard rápido e escalável.

## 8. Módulo financeiro

### O que já existe

- Lançamentos a pagar/receber.
- Categorias.
- Centros de custo.
- DRE.
- Fluxo de caixa.
- Orçamento.
- Conciliação.
- Extratos.
- Contas bancárias.
- Integração bancária.
- Rateio.
- Recorrência.
- Obras.
- Relatórios.

### Lacunas para ERP premium

1. Fechamento mensal com bloqueio de edição e reabertura auditada.
2. Plano de contas hierárquico contábil/gerencial completo.
3. Centro de custos com orçamento vs realizado por período.
4. Aprovação de pagamentos por alçada.
5. Contas a pagar com workflow: previsão → aprovação → pagamento → conciliação.
6. Contas a receber com cobrança, follow-up, régua de inadimplência.
7. Boletos/PIX/cartão com status de liquidação.
8. Conciliação N:N e parcial.
9. Comissões por vendedor/consultor/obra.
10. Anexos seguros por lançamento, contrato e fornecedor.
11. Importação/exportação Excel com templates validados.
12. Exportação PDF profissional dos relatórios.
13. Trilha de auditoria com diff legível e motivo obrigatório em alterações críticas.
14. Forecast de caixa.
15. Multiempresa/filiais/contas contábeis.

## 9. Segurança

### Problema S1 — Autorização granular incompleta

**Descrição:** Há mistura entre roles e permissions; alguns endpoints autenticados podem não exigir permissão granular.
**Impacto:** Risco de acesso indevido a dados financeiros ou administrativos.
**Solução:** Cobertura de permissões por rota, teste e2e de autorização, matriz SoD.
**Prioridade:** Crítica.
**Tempo estimado:** 5 a 8 dias.
**Benefício:** Redução de risco de vazamento/fraude.

### Problema S2 — CSRF mitigado por Origin, mas sem token anti-CSRF

**Descrição:** Cookies HTTP-only exigem proteção CSRF. Há guard por Origin/Referer para métodos inseguros, mas não há token duplo ou synchronizer token.
**Impacto:** Proteção boa, porém menos robusta contra cenários de proxy/misconfiguração.
**Solução:** Implementar double-submit CSRF token com cookie não-httpOnly + header `X-CSRF-Token`, validado no backend.
**Prioridade:** Alta.
**Tempo estimado:** 2 a 4 dias.
**Benefício:** Defesa em profundidade.

### Problema S3 — Upload valida extensão, não MIME/conteúdo

**Descrição:** CSV/OFX são validados por extensão e tamanho.
**Impacto:** Arquivos maliciosos ou malformados podem causar parsing caro, DoS leve ou exploração em cadeia.
**Solução:** Validar MIME quando confiável, assinatura/conteúdo OFX, encoding, número de linhas, timeout de parsing, antivírus/ClamAV em produção para anexos futuros.
**Prioridade:** Alta.
**Tempo estimado:** 3 a 5 dias.
**Benefício:** Uploads mais seguros.

### Problema S4 — Secrets e certificados no filesystem

**Descrição:** Integração bancária grava certificados em `secure/certs` e caminhos no banco. Credenciais são criptografadas, mas arquivos precisam de política forte.
**Impacto:** Vazamento de certificado permite acesso bancário.
**Solução:** Permissões 0600, volume seguro, rotação, KMS/Secrets Manager, criptografia at-rest de arquivos, não logar caminhos completos em produção.
**Prioridade:** Crítica.
**Tempo estimado:** 4 a 8 dias.
**Benefício:** Segurança bancária enterprise.

### Problema S5 — Falta de headers/políticas complementares documentadas

**Descrição:** Helmet está ativo, mas faltam políticas explícitas de CSP, HSTS por ambiente, Referrer-Policy, Permissions-Policy e auditoria de cookies.
**Impacto:** Maior superfície XSS/clickjacking/configuração fraca.
**Solução:** Configurar Helmet com CSP compatível com Ionic/Angular, HSTS em produção e testes de headers.
**Prioridade:** Média/Alta.
**Tempo estimado:** 2 a 4 dias.
**Benefício:** Hardening web.

## 10. Performance

### Problema P1 — Dashboards e relatórios podem gerar queries pesadas

**Impacto:** Lentidão com dados históricos.
**Solução:** Query profiling, índices por uso real, cache Redis, materialized views, paginação obrigatória, limites de intervalo.
**Prioridade:** Alta.
**Tempo estimado:** 7 a 15 dias.
**Benefício:** Escala e UX rápida.

### Problema P2 — Busca textual com `contains` insensível pode ficar cara

**Impacto:** Full scans em tabelas grandes.
**Solução:** Índices trigram (`pg_trgm`) ou busca full-text para clientes/fornecedores/descrições.
**Prioridade:** Média/Alta.
**Tempo estimado:** 2 a 5 dias.
**Benefício:** Busca rápida.

### Problema P3 — Componentes frontend pesados

**Impacto:** Renders lentos e consumo de memória em conciliação/listas.
**Solução:** `OnPush`, `trackBy`, virtual scroll, paginação server-side, memoização de pipes, separar modais.
**Prioridade:** Alta.
**Tempo estimado:** 5 a 10 dias.
**Benefício:** Interface fluida.

## 11. Qualidade, testes e documentação

### Problema Q1 — Cobertura de testes insuficiente para criticidade financeira

**Descrição:** Existem specs, mas a quantidade é pequena frente a 132 arquivos TS no backend e 92 no frontend, com vários fluxos financeiros críticos.
**Impacto:** Regressões em cálculos, DRE, conciliação e permissões podem chegar à produção.
**Solução:** Testes unitários para use cases, integração com banco de teste, e2e de auth/permissão, testes de contrato API, snapshots de relatórios financeiros.
**Prioridade:** Crítica.
**Tempo estimado:** 15 a 30 dias.
**Benefício:** Confiabilidade comercial.

### Problema Q2 — Lint com `--fix` como script principal

**Descrição:** Backend usa `eslint ... --fix` no script `lint`.
**Impacto:** CI pode alterar código em vez de falhar, mascarando problemas.
**Solução:** Separar `lint` sem fix e `lint:fix` com fix.
**Prioridade:** Média.
**Tempo estimado:** 1 hora.
**Benefício:** CI previsível.

### Problema Q3 — README/documentação operacional limitada

**Impacto:** Dificulta onboarding, deploy e suporte.
**Solução:** README raiz com arquitetura, setup, envs, migrations, seed, testes, deploy, backup, troubleshooting e runbooks.
**Prioridade:** Alta.
**Tempo estimado:** 2 a 4 dias.
**Benefício:** Operação profissional.

## 12. DevOps

### Problema O1 — CI/CD não evidente

**Descrição:** Não foi identificada configuração GitHub Actions no inventário inicial.
**Impacto:** Build/test/lint/deploy podem depender de execução manual.
**Solução:** Criar pipelines: lint, typecheck, unit, e2e, build Docker, scan de dependências, migrations dry-run, deploy com aprovação.
**Prioridade:** Alta.
**Tempo estimado:** 3 a 7 dias.
**Benefício:** Entregas confiáveis.

### Problema O2 — Backup/rollback/observabilidade sem runbook

**Impacto:** Risco alto em ERP financeiro.
**Solução:** Backup PostgreSQL automatizado e testado, restore mensal, rollback de deploy, health checks, métricas Prometheus/OpenTelemetry, alertas.
**Prioridade:** Crítica.
**Tempo estimado:** 5 a 10 dias.
**Benefício:** Continuidade operacional.

### Problema O3 — Docker precisa hardening

**Impacto:** Imagens podem ficar grandes ou rodar com privilégios desnecessários.
**Solução:** Multi-stage build, non-root user, healthcheck, variáveis por ambiente, secrets fora da imagem, scan Trivy/Grype.
**Prioridade:** Média/Alta.
**Tempo estimado:** 2 a 5 dias.
**Benefício:** Segurança e deploy mais robusto.

## 13. Classificação por grupo de arquivos

| Grupo | Classificação | Motivo |
|---|---:|---|
| `backend/src/main.ts` | Bom | Segurança básica, CORS, ValidationPipe e logs; precisa CSRF token e logger profissional. |
| `backend/src/auth/*` | Bom | Cookies HTTP-only e refresh rotation; precisa padronizar permissões, rate limit por IP/email e testes e2e. |
| `backend/src/users/*` | Regular | Usa DTOs, mas service aceita `any`, lógica de permissões/perfil simplificada e sem política granular. |
| `backend/src/clients/*` | Bom/Regular | CRUD útil; precisa busca/paginação/validação fiscal robusta e normalização de contatos/endereço. |
| `backend/src/suppliers/*` | Bom/Regular | Base funcional; precisa contratos, categorias fiscais, validação CNPJ/duplicidade e histórico. |
| `backend/src/contracts/*` | Regular | Necessita workflow de renovação, geração automática de cobranças e estados contratuais auditáveis. |
| `backend/src/financial/transactions/*` | Regular | CRUD financeiro central; tem paginação, auditoria e validação parcial, mas lógica de update possui expressão ambígua e precisa invariantes fortes. |
| `backend/src/financial/dashboard/*` | Regular | Funcionalmente rico, porém service grande e provável gargalo futuro. |
| `backend/src/financial/reconciliation/*` | Regular | Módulo avançado, mas arquivos grandes e modelo 1:1 limitam conciliação real. |
| `backend/src/financial/banking-integration/*` | Regular/Crítico | Integração valiosa, mas logging, certificados e tratamento de erros exigem hardening. |
| `backend/src/financial/reports/*` | Regular | Necessita templates, exportação robusta, caches e testes de consistência. |
| `backend/prisma/schema.prisma` | Bom | Domínio amplo e índices financeiros; precisa constraints, normalização de permissões e conciliação N:N. |
| `frontend/src/app/app.routes.ts` | Bom | Lazy loading amplo; precisa agrupamento por feature e guards por permissão. |
| `frontend/src/app/services/*` | Bom/Regular | Centraliza API, mas pode evoluir para tipos fortes, DTOs e tratamento de erro comum. |
| `frontend/src/app/financial/**` | Regular | Funcionalmente amplo, mas páginas grandes, SCSS extenso e muita lógica local. |
| `frontend/src/app/shared/components/**` | Bom | Indica reutilização; precisa virar design system consistente. |
| `frontend/src/app/login/**` | Bom/Regular | Fluxo básico bom; precisa MFA opcional, bloqueio por tentativas e UX de recuperação. |
| Docker/compose/deploy scripts | Regular | Há base de deploy, mas falta pipeline, hardening, rollback e observabilidade. |
| Scripts soltos raiz/backend | Ruim | Devem ser organizados, documentados ou removidos. |

## 14. Funcionalidades faltantes priorizadas

### Alto impacto

- Multiempresa/filiais e segregação por empresa.
- Plano de contas contábil/gerencial completo.
- Fechamento mensal financeiro/contábil.
- Workflow de aprovação de pagamentos.
- Conciliação N:N, parcial e automática com regras.
- Régua de cobrança e inadimplência.
- Exportação Excel/PDF profissional.
- Anexos seguros com antivírus e classificação.
- Auditoria completa com diff e motivo.
- BI/dashboard personalizável.

### Médio impacto

- CRM simples: leads, propostas, funil e conversão.
- Estoque/compras para obras.
- Ordens de serviço/projetos.
- Comissões.
- Integração fiscal/NFSe/NFe.
- Webhooks e API pública.
- Notificações in-app/e-mail/WhatsApp.

### Baixo/médio impacto

- Temas customizáveis.
- Atalhos de teclado avançados.
- Tour guiado/onboarding.
- Favoritos e filtros salvos por usuário.

## 15. IA recomendada

- Assistente financeiro conversacional: “quais clientes atrasaram este mês?”, “explique a queda de margem”.
- Previsão de caixa por histórico, recorrências e sazonalidade.
- Score de inadimplência por cliente.
- Detecção de lançamentos duplicados/anômalos.
- OCR de notas, recibos e comprovantes.
- Classificação automática de categoria/centro de custo a partir do texto do extrato.
- Resumo executivo diário por WhatsApp/e-mail.
- Recomendações de cobrança e renegociação.
- Chat interno com contexto por cliente/obra/lançamento.
- Geração de DRE comentada com insights.
- Auditor financeiro virtual para alertar inconsistências.

## 16. Escalabilidade

- **100 usuários:** Suportável com ajustes mínimos, desde que banco/Redis estejam estáveis.
- **500 usuários:** Exige paginação obrigatória, índices revisados, cache de dashboard e logs adequados.
- **5.000 usuários:** Exige observabilidade, filas para jobs, read replicas, cache, materialized views, frontend otimizado e CI/CD maduro.
- **50.000 usuários:** Exige arquitetura multi-tenant formal, particionamento, filas/eventos, isolamento por empresa, autoscaling, CDN, rate limits avançados, auditoria assíncrona e SRE.

Gargalos principais: dashboard/relatórios, conciliação/importação bancária, busca textual, services monolíticos, ausência de filas, frontend com telas grandes e falta de cache/materialized views.

## 17. Roadmap

### Curto prazo — 1 semana

1. Padronizar lint sem `--fix` e adicionar typecheck.
2. Criar DTOs de query/paginação para financeiro.
3. Corrigir permissões críticas por rota financeira.
4. Adicionar filtro global de erros.
5. Revisar logging para não expor dados sensíveis.
6. Documentar variáveis `.env` e fluxo de setup.
7. Criar CI básico: backend build/test, frontend build/lint.
8. Hardening inicial de upload e certificados.

### Médio prazo — 30 dias

1. Swagger/OpenAPI.
2. Testes de autorização, DRE, fluxo de caixa e conciliação.
3. Refatorar services financeiros grandes em use cases/query services.
4. Criar design system base e componentes compartilhados.
5. Materialized views/cache para dashboard.
6. Matriz RBAC/permissions normalizada.
7. Backup/restore automatizado e runbook.
8. Observabilidade com logs estruturados e métricas.
9. Exportação Excel/PDF de relatórios.
10. Fechamento mensal inicial.

### Longo prazo — 90 dias

1. Multiempresa/filiais.
2. Conciliação N:N/parcial e regras inteligentes.
3. Workflow de aprovação de pagamentos.
4. Régua de cobrança e inadimplência.
5. IA para classificação, previsão e insights.
6. BI/dashboard customizável.
7. Anexos seguros com OCR.
8. API pública/webhooks.
9. Escala com filas, read replicas e particionamento seletivo.
10. Programa de qualidade: cobertura mínima, mutation testing em regras críticas e testes e2e.

## 18. Backlog consolidado

| ID | Tarefa | Prioridade | Complexidade | Tempo | Benefício |
|---|---|---:|---:|---:|---|
| SEC-01 | Padronizar permissões granulares em todas as rotas críticas | 🔴 Crítico | Alta | 5-8 dias | Reduz risco de acesso indevido |
| SEC-02 | Proteger certificados bancários com permissões/KMS/rotação | 🔴 Crítico | Alta | 4-8 dias | Segurança bancária enterprise |
| DB-01 | Formalizar invariantes financeiras por status/tipo | 🔴 Crítico | Alta | 5-10 dias | Relatórios confiáveis |
| QA-01 | Testes críticos de financeiro/autorização/conciliação | 🔴 Crítico | Alta | 15-30 dias | Menos regressões |
| OPS-01 | Backup/restore/rollback com runbook | 🔴 Crítico | Média | 5-10 dias | Continuidade operacional |
| API-01 | DTOs de query/paginação/filtros | 🟠 Alto | Média | 2-4 dias | API robusta |
| API-02 | Filtro global de exceções e códigos de erro | 🟠 Alto | Média | 3-5 dias | UX e suporte melhores |
| API-03 | Swagger/OpenAPI | 🟠 Alto | Média | 4-7 dias | Integração profissional |
| ARCH-01 | Quebrar services financeiros grandes em use cases | 🟠 Alto | Alta | 10-15 dias | Manutenção e testes |
| FRONT-01 | Design system e componentes financeiros reutilizáveis | 🟠 Alto | Alta | 10-20 dias | UX consistente |
| FRONT-02 | Otimizar listas com OnPush/trackBy/virtual scroll | 🟠 Alto | Média | 5-10 dias | Performance visual |
| DASH-01 | Cache/materialized views para dashboard | 🟠 Alto | Alta | 8-12 dias | Dashboard rápido |
| FIN-01 | Conciliação N:N/parcial | 🟠 Alto | Alta | 8-15 dias | Adequação à realidade bancária |
| FIN-02 | Fechamento mensal com auditoria | 🟠 Alto | Alta | 8-15 dias | Governança financeira |
| FIN-03 | Workflow de aprovação de pagamentos | 🟠 Alto | Alta | 10-20 dias | Controle antifraude |
| OPS-02 | CI/CD completo com scans | 🟠 Alto | Média | 3-7 dias | Deploy confiável |
| OBS-01 | Logs estruturados + métricas + tracing | 🟠 Alto | Média | 5-10 dias | Operação profissional |
| DB-02 | Normalizar permissões em tabelas | 🟠 Alto | Alta | 8-12 dias | Governança de acesso |
| UX-01 | Padronizar loading/empty/error/toasts/confirmações | 🟡 Médio | Média | 5-8 dias | Melhor experiência |
| SEC-03 | Double-submit CSRF token | 🟠 Alto | Média | 2-4 dias | Defesa em profundidade |
| SEC-04 | Hardening Helmet CSP/HSTS/Permissions-Policy | 🟡 Médio | Baixa | 2-4 dias | Menor superfície web |
| PERF-01 | Índices por queries reais + pg_trgm | 🟡 Médio | Média | 2-5 dias | Busca rápida |
| DOC-01 | README/runbooks/envs/setup/deploy | 🟠 Alto | Baixa | 2-4 dias | Onboarding e suporte |
| OPS-03 | Docker hardening/non-root/healthcheck/scans | 🟡 Médio | Média | 2-5 dias | Segurança deploy |
| IA-01 | Classificação automática de extratos | 🟡 Médio | Alta | 15-25 dias | Produtividade financeira |
| IA-02 | Previsão de caixa e inadimplência | 🟡 Médio | Alta | 20-30 dias | Gestão estratégica |
| ERP-01 | Multiempresa/filiais | 🟠 Alto | Muito alta | 30-60 dias | Escala comercial |
| REPORT-01 | Exportação Excel/PDF profissional | 🟠 Alto | Média | 5-10 dias | Valor ao usuário |
| AUDIT-01 | Auditoria com diff legível e motivo obrigatório | 🟠 Alto | Média | 5-10 dias | Compliance |
| UPLOAD-01 | Anexos seguros com antivírus/OCR | 🟡 Médio | Alta | 15-25 dias | Automação e segurança |

## 19. Lista objetiva de bugs/riscos encontrados

- Expressão ambígua em validação de update de transação (`data.tipo ?? existing?.tipoLancamento ? ...`) pode não refletir o tipo real do lançamento.
- `createMany` não aplica as mesmas regras de negócio de `create` para cada item.
- Permissões inconsistentes entre `RolesGuard`, `PermissionsGuard` e lógica frontend.
- Conciliação 1:1 impede casos reais de pagamento agrupado/parcial.
- Logging com `console` em integrações críticas.
- Upload valida extensão, mas não conteúdo de forma robusta.
- Scripts operacionais/destrutivos soltos no repositório.
- Falta OpenAPI e contrato formal de API.
- Falta CI/CD identificado no repositório.
- Componentes financeiros muito grandes e potencialmente lentos.

## 20. Conclusão

O projeto tem uma base muito boa para virar um ERP comercial, especialmente no módulo financeiro. A prioridade agora deve ser profissionalizar governança, segurança, testes, documentação e arquitetura interna antes de expandir demais o escopo. Com 30 dias de estabilização focada e 90 dias de evolução planejada, o Sistema Macedo pode atingir um padrão competitivo para operação financeira, obras e gestão empresarial.
