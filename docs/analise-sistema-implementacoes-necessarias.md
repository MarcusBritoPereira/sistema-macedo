# Análise do sistema UP_Fin e implementações necessárias (versão acionável)

> Objetivo: transformar diagnóstico técnico em backlog executável, com foco em segurança, confiabilidade, escala e governança de produto.

---

## 1) Leitura do sistema como um todo

### Arquitetura atual
- **Backend:** NestJS modular (auth, users, clients, suppliers, contracts, financial, fiscal, audit). 
- **Frontend:** Angular + Ionic, com módulos por domínio financeiro e serviços centralizados para API.
- **Dados:** Prisma + PostgreSQL com modelo de domínio amplo (clientes, contratos, lançamentos, conciliação, integração bancária etc.).

### Sinais de maturidade já presentes
- Hardening básico no backend com `helmet`, `ValidationPipe` (`whitelist` e `transform`) e CORS com allowlist explícita.
- Throttling global configurado no `AppModule`.
- Estrutura de módulos e DTOs em parte dos domínios (ex.: users, clients, suppliers).

### Gargalos sistêmicos identificados
- Segurança de sessão ainda frágil no frontend (JWT em `localStorage`).
- Contratos API inconsistentes em pontos críticos (aceitando `Prisma.*Input` diretamente no controller).
- RBAC aplicado de forma desigual entre módulos.
- Performance sem baseline formal (índices e otimização de queries ainda incipientes).
- Cobertura de testes críticos insuficiente para mudanças de maior risco.

---

## 2) Implementações necessárias por prioridade

## P0 — Redução imediata de risco (executar primeiro)

### P0.1 — Sessão segura (substituir token em localStorage)
**Evidência:** `AuthService` persiste `token`/`user` no navegador e o interceptor limpa storage em `401`.

**Implementar:**
1. Fluxo `access token` curto + `refresh token` rotativo em cookie `HttpOnly`.
2. Endpoint `POST /auth/refresh` + rotação com revogação de sessão.
3. Endpoint `POST /auth/logout` com invalidação server-side.
4. Frontend sem leitura/escrita de token em storage (somente sessão por cookie).

**Critério de aceite:**
- Nenhum uso de `localStorage` para sessão/autenticação.
- Fluxo de expiração e renovação validado em e2e.

### P0.2 — Segredos e criptografia em repouso
**Evidência:** schema de integração bancária mantém `apiKey` e `clientSecret` como campos string; há certificados/chaves versionados em `backend/secure/certs`.

**Implementar:**
1. Criptografia de credenciais bancárias (envelope encryption).
2. Rotação de todos os certificados/chaves já expostos.
3. Segregação de segredo por ambiente (dev/hml/prod).
4. Pipeline com scanner de segredos (falha obrigatória no PR).

**Critério de aceite:**
- 0 segredos/certificados sensíveis no repositório.
- Credenciais sensíveis cifradas antes de persistência.

### P0.3 — Seed segura e bootstrap sem credenciais previsíveis
**Evidência:** seed utiliza senha padrão (`123456`) para contas conhecidas.

**Implementar:**
1. Exigir senha de seed por variável de ambiente em ambientes não-dev.
2. Separar seed de desenvolvimento e seed de homologação/produção.
3. Bloquear execução de seed insegura fora de ambiente local.

**Critério de aceite:**
- Nenhuma senha default em seed executável de hml/prod.

---

## P1 — Governança de API, autorização e operação

### P1.1 — Desacoplar API de Prisma interno
**Evidência:** controller financeiro recebe `Prisma.LancamentoFinanceiroCreateInput` e `UpdateInput` diretamente.

**Implementar:**
1. Criar DTOs de entrada/saída para transações (create/update/bulk/list).
2. Padronizar validações semânticas (`class-validator` + regras de domínio).
3. Criar mapeadores DTO ↔ domínio ↔ persistência.
4. Cobrir com testes de contrato HTTP.

**Critério de aceite:**
- 100% dos endpoints críticos sem `Prisma.*Input` em controller.

### P1.2 — RBAC transversal por domínio
**Evidência:** `users` usa `RolesGuard` + `@Roles('ADMIN')`; endpoints financeiros sensíveis usam apenas `AuthGuard('jwt')`.

**Implementar:**
1. Matriz de permissões por domínio (users, transactions, bank-accounts, reconciliation, reports).
2. Guard de autorização por escopo/ação (`read`, `create`, `update`, `delete`, `approve`).
3. Aplicar `@Roles`/policy guard nos endpoints sensíveis.
4. Registrar ação e autor em log de auditoria para operações críticas.

**Critério de aceite:**
- Todos os endpoints de alto impacto com política explícita e auditável.

### P1.3 — Observabilidade mínima obrigatória
**Implementar:**
1. Métricas por endpoint (p50/p95, taxa de erro, throughput).
2. Correlação de logs com `requestId` e usuário autenticado.
3. Dashboard por domínio (auth, transactions, reconciliação, integração bancária).
4. Alertas iniciais (5xx, timeout, job failure, degradação p95).

**Critério de aceite:**
- Dashboard operacional ativo e alertas disparando em ambiente de homologação.

---

## P2 — Escala de dados, performance e qualidade contínua

### P2.1 — Índices e tuning de consultas
**Evidência:** schema sem índices explícitos (`@@index/@index`) para filtros frequentes.

**Implementar:**
1. Índices para `LancamentoFinanceiro` (tipo, status, dataVencimento, dataCompetencia, contaBancariaId, categoriaId, centroCustoId, clienteId, fornecedorId).
2. Índices para tabelas de conciliação/importação conforme filtros reais.
3. Revisão `EXPLAIN ANALYZE` dos 10 endpoints mais consultados.

**Critério de aceite:**
- Redução de p95 nos endpoints financeiros prioritários.

### P2.2 — Remoção de padrão N+1 em contas bancárias
**Evidência:** endpoint de contas executa múltiplas queries por conta (`count`, `findFirst`, `findMany` em loop).

**Implementar:**
1. Agregações por conta em lote (groupBy/subqueries).
2. Pré-cálculo de saldo/reconciliação quando viável.
3. Cache curto para metadados de baixa volatilidade.

**Critério de aceite:**
- Tempo de resposta escalando sublinearmente com o número de contas.

### P2.3 — Testes de regressão de fluxo crítico
**Evidência:** specs com `should be defined` sem validação de regra de negócio.

**Implementar:**
1. Unit tests de regras financeiras e geração de contratos.
2. Contract tests para endpoints de transações e reconciliação.
3. E2E de ponta a ponta: login, criação/edição de lançamento, conciliação, relatório.
4. Gate de CI com cobertura mínima para domínios críticos.

**Critério de aceite:**
- Pipeline bloqueando merge sem testes críticos aprovados.

---

## 3) Backlog sugerido de execução (12 semanas)

### Sprint 1 (Semanas 1–2) — Segurança de sessão + segredos
- [ ] Implementar refresh token rotativo em cookie HttpOnly.
- [ ] Remover token de `localStorage` no frontend.
- [ ] Criptografar credenciais de integração bancária.
- [ ] Ativar scanner de segredos no CI.

### Sprint 2 (Semanas 3–4) — Contratos de API + RBAC
- [ ] Trocar `Prisma.*Input` por DTOs nos controllers financeiros.
- [ ] Criar matriz de permissões e aplicar guards/policies.
- [ ] Auditar ações sensíveis (alteração/remoção/conciliação).

### Sprint 3 (Semanas 5–8) — Performance de dados
- [ ] Adicionar índices de alto impacto.
- [ ] Remover N+1 do endpoint de contas bancárias.
- [ ] Medir antes/depois com baseline p95.

### Sprint 4 (Semanas 9–12) — Testes e operação contínua
- [ ] E2E dos fluxos críticos.
- [ ] Contract tests para API financeira.
- [ ] Dashboard + alertas + runbooks operacionais.

---

## 4) Dependências técnicas relevantes
- Migração de sessão depende de ajuste conjunto backend + frontend + CORS/cookies.
- Criptografia de segredos depende de estratégia de chaves por ambiente.
- Índices devem ser validados em staging com carga representativa para evitar regressão de escrita.
- RBAC transversal exige alinhamento prévio com áreas de negócio (papéis e escopos reais).

---

## 5) Resultado esperado
Após executar esse plano, o UP_Fin terá:
1. **Segurança de acesso significativamente superior** (sessão, segredos e permissões).
2. **APIs mais estáveis para evolução** (DTOs e contratos explícitos).
3. **Melhor escalabilidade operacional** (queries otimizadas e observabilidade real).
4. **Menor risco de regressão** em releases por cobertura de testes críticos.
