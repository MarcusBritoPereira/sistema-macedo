# Matriz de Auditoria Página-a-Página — Sistema Macedo

## Legenda de status
- **OK**: funcional e coerente com o fluxo esperado.
- **Risco**: funciona hoje, mas com chance de quebra/regressão ou limitação relevante.
- **Quebrado**: inconsistência funcional clara no código atual.
- **Melhoria**: funciona, mas há ganho importante de UX/performance/governança.

---

## Resumo executivo de risco de atualização (sistema atualmente funcional)

**Resposta curta:** é possível evoluir com segurança, mas **não** recomendo alterar tudo de uma vez.

### Probabilidade de quebra por tipo de mudança
- **Baixa**: ajustes de texto/UX, mensagens, pequenos refinamentos visuais.
- **Média**: mudanças em formulários/DTOs/endpoints com compatibilidade reversa.
- **Alta**: refactor transversal de autenticação/perfis, reconciliação bancária, schema/migrations sem rollout incremental.

### Fatores que aumentam risco hoje
1. Cobertura de testes ainda superficial em partes críticas (e2e base e vários specs "should be defined").
2. Contratos HTTP em módulos importantes ainda acoplados a tipos Prisma.
3. Muitos fluxos dependem de integração entre rotas, forms e modais (efeito cascata).

### Mitigação recomendada (antes de qualquer sprint de mudança estrutural)
1. Baseline de regressão (fluxos críticos de ponta a ponta).
2. Entregas incrementais por domínio (clientes → contratos → lançamentos…).
3. Feature flags/rollout gradual para mudanças sensíveis.
4. Plano de rollback com snapshot de banco antes de migration.

---

## Matriz por página/módulo (Frontend + Backend)

## 1) Autenticação
### Página: `login`
- **Status:** **Risco**
- **O que funciona:** formulário com validação básica e estado de submit.
- **Risco:** token em `localStorage` e sem fluxo robusto de refresh/expiração coordenada.
- **Melhorias:** política de sessão (refresh token), mensagens de erro por tipo (401/timeout), observabilidade de falhas de login.

## 2) Clientes
### Página: `clients` (lista + filtros)
- **Status:** **Melhoria**
- **O que funciona:** listagem executiva, filtros, ordenação, KPIs e ações de exclusão.
- **Risco:** regra de `TOP_REVENUE` está fixa (`2000`) e não percentual real; pode distorcer decisão.
- **Melhorias:** paginação server-side, filtros persistidos, ranking por percentil configurável.

### Página: `clients/:id` (CRUD form detalhado)
- **Status:** **Risco**
- **O que funciona:** form amplo por seções (cadastral/fiscal/jurídico), create/update/delete.
- **Risco:** validações de negócio ainda básicas (CPF/CNPJ/normalização/erros de unicidade).
- **Melhorias:** máscaras + validação semântica + mensagens de erro mapeadas por código HTTP.

### Backend: `clients`
- **Status:** **Melhoria**
- **O que funciona:** CRUD + bulk + KPIs + visão executiva.
- **Risco:** service usa `Prisma.*Input` em vez de DTO puro (governança de contrato).
- **Melhorias:** DTOs completos nos services/use-cases, testes de contrato e de importação com erro por linha.

## 3) Fornecedores
### Página: `suppliers` / `suppliers/:id`
- **Status:** **Melhoria**
- **O que funciona:** CRUD protegido por JWT.
- **Risco:** falta trilha clara de validação de CNPJ e feedback refinado em erro.
- **Melhorias:** UX de conflito de unicidade, soft delete consistente, filtros avançados.

### Backend: `suppliers`
- **Status:** **OK / Melhoria**
- **O que funciona:** endpoints principais com DTO de criação.
- **Melhorias:** ampliar testes de regras e cenários de falha.

## 4) Usuários
### Página: `users` / `users/:id`
- **Status:** **Risco**
- **O que funciona:** CRUD protegido e restrito por role ADMIN no backend.
- **Risco:** governança de perfis ainda concentrada; falta matriz fina de permissões por módulo.
- **Melhorias:** RBAC granular por domínio e logs administrativos completos.

### Backend: `users`
- **Status:** **OK / Melhoria**
- **O que funciona:** proteção com `AuthGuard + RolesGuard`.
- **Melhorias:** ampliar uso de `RolesGuard` nos demais módulos sensíveis.

## 5) Contratos
### Página: `contracts` / `contracts/:id`
- **Status:** **Risco**
- **O que funciona:** CRUD + geração financeira.
- **Risco:** geração financeira depende de regras de competência/vencimento; risco de regressão sem testes robustos.
- **Melhorias:** simulação antes de gerar, idempotência explícita, trilha de auditoria por lote.

### Backend: `contracts`
- **Status:** **Risco**
- **O que funciona:** soft delete e geração de lançamentos por período.
- **Risco:** loop mensal com queries repetidas (performance/consistência em escala).
- **Melhorias:** processamento batch otimizado + validações de borda (início/fim/mês parcial).

## 6) Financeiro — Lançamentos
### Página: `financial`, `financial/receivables`, `financial/payables`, detalhes
- **Status:** **Risco**
- **O que funciona:** CRUD operacional amplo para receitas/despesas.
- **Risco:** complexidade alta de filtros/status/atualização em lote sem suíte de regressão forte.
- **Melhorias:** testes de regressão de filtros e ações em massa; UX de loading/estado vazio.

### Backend: `financial/transactions`
- **Status:** **Risco**
- **O que funciona:** create/list/update/delete com filtros úteis.
- **Risco:** entrada com `Prisma.LancamentoFinanceiro*Input` (acoplamento + quebra potencial em mudanças de schema).
- **Melhorias:** DTOs de API estáveis e validação semântica de regra financeira.

## 7) Financeiro — Dashboard / Cash Flow / DRE
### Páginas: `financial/dashboard`, `financial/cash-flow`, `financial/dre`
- **Status:** **Melhoria**
- **O que funciona:** visões gerenciais e indicadores.
- **Risco:** decisões dependem de consistência de classificação/categoria e fechamento.
- **Melhorias:** reconciliação de métricas entre telas + snapshot mensal de fechamento.

## 8) Financeiro — Categorias / Centros de Custo / Budget
### Páginas: `financial/categories`, `financial/cost-centers`, `financial/budget`
- **Status:** **OK / Melhoria**
- **O que funciona:** CRUDs estruturantes para governança financeira.
- **Risco:** qualidade do dado depende de aderência operacional (cadastros duplicados/não padronizados).
- **Melhorias:** deduplicação assistida, bloqueio de exclusão com dependência, assistente de classificação.

## 9) Bancos e Reconciliação
### Páginas: `financial/bank-accounts`, wizard, `financial/reconciliation`, `financial/banking-configuration`
- **Status:** **Risco alto (mudanças)**
- **O que funciona:** cadastro de contas, integração bancária, importação e conciliação.
- **Risco:** fluxo sensível a integrações externas, arquivos e regras de matching.
- **Risco técnico:** endpoint de contas bancárias com padrão N+1 para metadados por conta.
- **Melhorias:** otimização de consulta agregada, monitoramento de jobs, UX de exceção conciliatória.

## 10) Relatórios e Auditoria
### Páginas: `financial/reports`, `financial/history`
- **Status:** **Melhoria**
- **O que funciona:** geração/visualização de relatórios e consulta de histórico.
- **Risco:** auditoria ainda concentrada em alguns fluxos (não transversal).
- **Melhorias:** trilha unificada de auditoria (CRUD crítico + alterações sensíveis) e filtros avançados.

## 11) Modais compartilhados
### `quick-create-modal`
- **Status:** **Quebrado (inconsistência de payload para cliente)**
- **Problema:** envia `cpfCnpj` para cliente, enquanto o domínio trabalha com `cpf`/`cnpj`.
- **Impacto:** cadastro rápido de cliente pode vir incompleto/inconsistente.
- **Ação:** ajustar payload e validação contextual por tipo de entidade.

### `transaction-modal`, `rateio-modal`, `searchable-selection-modal`
- **Status:** **Melhoria**
- **O que funciona:** componentes reutilizáveis e fluxo de seleção/edição.
- **Melhorias:** validação mais forte, erro amigável e feedback de operações assíncronas.

---

## Matriz de prioridade para sprint (impacto x esforço)

## Sprint 1 — “Sem risco de arquitetura” (baixo/médio esforço, alto impacto)
1. Corrigir inconsistências funcionais de modal (`quick-create`).
2. Padronizar mensagens de erro de formulário (cliente/fornecedor/contrato).
3. Ajustes de UX (textos quebrados, loading/empty states).
4. Criar suíte mínima de regressão manual checklist + testes automatizados críticos.

## Sprint 2 — “Governança de API e segurança de domínio”
1. Introduzir DTOs estáveis nos endpoints financeiros críticos.
2. Expandir RBAC para módulos além de usuários.
3. Fortalecer auditoria transversal (CRUDs sensíveis).

## Sprint 3 — “Escala e performance”
1. Remover N+1 de contas bancárias.
2. Otimizar geração de lançamentos de contrato.
3. Refinar reconciliação com observabilidade e métricas de acerto.

## Sprint 4 — “Excelência de produto e UX premium”
1. Validação semântica avançada (CPF/CNPJ/documentos).
2. Personalização de filtros e painéis.
3. Melhorias de produtividade (atalhos, templates, importadores robustos).

---

## Checklist de segurança para não quebrar em atualização
1. Homologação obrigatória com snapshot de produção anonimizado.
2. Rollout por módulo (não monolítico).
3. Backups + plano de rollback testado antes de migrations.
4. Monitoramento pós-deploy (erro 4xx/5xx, latência, jobs de integração).
5. Janela de mudança com freeze de funcionalidades paralelas.

