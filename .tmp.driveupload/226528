# Plano de Implementação — Segurança, Design System e Desempenho (Sistema Macedo)

## 1) Diagnóstico consolidado (estado atual)

### Segurança
- **Pontos positivos já implementados:** `helmet`, `ValidationPipe` com `whitelist` e `transform`, CORS por allowlist e throttling global no backend. 
- **Lacunas críticas observadas no código:**
  - Token JWT armazenado em `localStorage` no frontend (risco XSS/session hijack).
  - Banco armazena credenciais de integração bancária (`apiKey`, `clientSecret`) sem criptografia em repouso.
  - Certificados/chaves de mock (`mock.crt` e `mock.key`) versionados no repositório.
  - Seeds e scripts usam credenciais padrão previsíveis (`123456`, `admin123`).
  - RBAC existe, mas está mais evidente no módulo de usuários; falta padronização transversal por domínio sensível.

### Design System
- **Pontos positivos:** tema base estruturado com tokens Ionic (`--ion-color-*`), tipografia consistente e padronização visual inicial.
- **Lacunas principais:**
  - Grande volume de sobrescritas globais em `global.scss`, dificultando isolamento e evolução por componente.
  - Falta de documentação formal de componentes, padrões de espaçamento e estados (loading/erro/vazio).
  - Ausência de governança de acessibilidade contínua (contraste, foco visível, navegação por teclado em componentes críticos).

### Desempenho
- **Pontos positivos:** stack moderna (Nest 11, Angular 20, Prisma), orçamento de bundle configurado para produção no frontend.
- **Lacunas principais:**
  - Modelo Prisma sem índices explícitos para consultas recorrentes (potencial degradação com crescimento de dados).
  - Padrão de múltiplos `subscribe` e cargas amplas no frontend (ex.: consultas com `take: 10000`) em telas financeiras.
  - Falta de estratégia padronizada de cache, paginação server-side e observabilidade de latência por endpoint.
  - Fluxos críticos de integração/conciliação têm risco de gargalo sem baseline de performance e SLO definidos.

---

## 2) Metas por pilar (90 dias)

### Segurança (objetivo)
Reduzir superfície de ataque e aumentar resiliência operacional, com foco em credenciais, sessão e trilha de auditoria.

### Design System (objetivo)
Transformar o estilo atual em sistema governável: tokens, componentes, acessibilidade e consistência de UX.

### Desempenho (objetivo)
Melhorar latência percebida e escalabilidade de consultas/fluxos críticos com métricas e otimizações incrementais.

---

## 3) Plano de implementação por fase

## Fase 0 — Base de controle (Semana 1)

### Entregáveis
1. **Baseline técnico e de risco**
   - Inventário de endpoints críticos (auth, financeiro, reconciliação, contratos).
   - Métricas iniciais: p95 de APIs, tempo de carregamento das páginas principais, tamanho de bundle.
2. **Gate mínimo de qualidade**
   - Pipeline com lint + testes existentes + verificação de segredos no repositório.
3. **Backlog priorizado por impacto/esforço**
   - Classificação MoSCoW para ações de segurança, design e performance.

### Critérios de aceite
- Dashboard técnico inicial publicado (mesmo que simples).
- Priorização aprovada para execução das próximas fases.

---

## Fase 1 — Segurança essencial (Semanas 2 a 4)

### Trilhas de implementação
1. **Sessão e autenticação**
   - Migrar JWT de `localStorage` para cookie `httpOnly` + `secure` + `sameSite` (com estratégia de CSRF para mutações).
   - Introduzir refresh token rotativo com revogação por dispositivo/sessão.
2. **Gestão de segredos**
   - Remover `mock.key` e `mock.crt` do versionamento e rotacionar artefatos relacionados.
   - Criptografar campos sensíveis de integração bancária em repouso (KMS/Vault ou envelope crypto no app).
3. **Hardening de acesso**
   - Expandir guardas de autorização por perfil/permissão para módulos financeiros sensíveis.
   - Definir trilha de auditoria para ações críticas (alteração de dados bancários, conciliações, exclusões).
4. **Higiene operacional**
   - Eliminar senhas default em seed de produção/homologação.
   - Política de segredo por ambiente + rotação sem downtime.

### KPIs da fase
- 0 segredos sensíveis no repositório.
- 100% dos módulos críticos com regra explícita de autorização.
- 100% das ações críticas com log auditável.

---

## Fase 2 — Design System governável (Semanas 3 a 6, em paralelo)

### Trilhas de implementação
1. **Fundação de tokens e semântica visual**
   - Consolidar tokens (cor, spacing, radius, tipografia, elevação) em camadas: `core`, `semantic`, `component`.
   - Definir escala oficial de espaçamento e tipografia.
2. **Biblioteca de componentes de domínio**
   - Criar padrões para: cards financeiros, tabelas, filtros, estados vazios, modais, feedback de erro/sucesso.
   - Remover regras globais excessivas e migrar para estilos por componente quando possível.
3. **Acessibilidade e consistência**
   - Checklist WCAG 2.1 AA para foco, contraste, navegação por teclado, labels e mensagens de erro.
   - Padronizar microcopy de validação e estados de formulário.
4. **Governança e documentação**
   - Documentação de uso (ex.: Storybook ou guia interno) com “do/don’t”.
   - Processo de aprovação de novos componentes/tokens.

### KPIs da fase
- 80%+ das telas críticas aderentes ao novo padrão de componentes.
- 100% dos componentes novos seguindo guideline oficial.
- Redução de regressões visuais em releases.

---

## Fase 3 — Performance orientada por dados (Semanas 5 a 10)

### Trilhas de implementação
1. **Banco e consultas**
   - Mapear queries mais custosas via logs/telemetria e criar índices compostos para filtros mais usados.
   - Padronizar paginação server-side e limites de consulta por endpoint.
2. **Frontend e rendering**
   - Introduzir estratégia de carregamento incremental em listas grandes.
   - Revisar telas com múltiplos `subscribe` para composição reativa com cancelamento (`switchMap`, `takeUntil`).
   - Adotar `trackBy` e estratégia de detecção eficiente em listas volumosas.
3. **Cache e redução de chamadas**
   - Cache curto para dados de baixa volatilidade (categorias, centros de custo, metadados).
   - Evitar recargas completas após mutações simples (update otimista/controlado).
4. **Integrações e jobs**
   - Definir filas/retries/backoff para sincronizações bancárias.
   - Medir throughput e taxa de falha por job de reconciliação/importação.

### KPIs da fase
- Redução de pelo menos 30% no p95 dos endpoints financeiros mais usados.
- Redução de pelo menos 40% no tempo de carregamento das listas principais.
- Taxa de erro de jobs críticos abaixo de 1%.

---

## Fase 4 — Consolidação e escala (Semanas 10 a 12)

### Entregáveis
1. **SLOs oficiais por domínio** (auth, financeiro, reconciliação).
2. **Runbooks** de incidentes (segurança, indisponibilidade, degradação de latência).
3. **Plano contínuo trimestral** de melhoria com roadmap e responsáveis.

### Critérios de aceite
- Rotina de observabilidade e segurança incorporada ao ciclo de release.
- Métricas comparativas pré/pós implantação documentadas.

---

## 4) Priorização objetiva (ordem sugerida)

1. **Imediato (alto risco):** segredos, sessão, credenciais default, artefatos sensíveis em repositório.
2. **Curto prazo (alto impacto):** autorização granular + auditoria transversal.
3. **Médio prazo:** design system com documentação e acessibilidade contínua.
4. **Contínuo:** índices, paginação, cache e otimização de fluxo de reconciliação.

---

## 5) Estrutura de equipe recomendada

- **Security Champion (1):** lidera hardening, gestão de segredos e trilhas de auditoria.
- **Tech Lead Front (1):** lidera design system e performance de UX.
- **Tech Lead Back (1):** lidera otimização de API, banco e integrações.
- **QA/Automação (1-2):** regressão crítica + testes de contrato/performance.
- **PO/PM (1):** priorização e gestão de dependências entre frentes.

---

## 6) Riscos de execução e mitigação

- **Risco:** quebra de sessão ao migrar estratégia de token.
  - **Mitigação:** rollout progressivo com feature flag e fallback controlado.
- **Risco:** regressão visual durante migração de estilos globais.
  - **Mitigação:** snapshots visuais e migração por módulo.
- **Risco:** índices inadequados impactarem escrita.
  - **Mitigação:** validação em homologação com carga realista e revisão de plano de execução.

---

## 7) Primeiro sprint recomendado (10 dias úteis)

1. Remover segredos versionados e implantar scanner de segredos no CI.
2. Definir arquitetura de sessão segura (cookie + refresh token).
3. Levantar top 10 queries lentas e aplicar primeiros índices.
4. Publicar guideline v1 de design system (tokens + 5 componentes-chave).
5. Implantar dashboard de baseline (latência, erros, tempo de carregamento).

Com isso, o time reduz risco imediatamente e cria base técnica para evolução sustentável dos três pilares.
