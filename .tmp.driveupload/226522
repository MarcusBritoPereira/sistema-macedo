# Plano de implementação (revisado com feedback)

## Contexto do ajuste solicitado
Com base no feedback mais recente:
- **Sicredi e caixa/espécie já estão funcionando** (não é prioridade de implementação).
- O problema crítico atual é a **tela de conciliação travando** por tentar carregar ~3.000 registros não conciliados de uma vez.

---

## 1) Prioridade máxima: performance da conciliação

### Problema
- A listagem de conciliação tenta renderizar todos os pendentes em uma única carga.
- Com alto volume (ex.: 3.000+), ocorre lentidão severa/travamento no front.

### Objetivo
- Garantir abertura e uso fluido da tela mesmo com milhares de registros pendentes.

### Plano técnico

#### 1.1 Paginação server-side obrigatória
- Endpoint deve retornar lotes (ex.: `limit=50`, `offset`/`cursor`).
- Front deve carregar apenas a página atual.
- Exibir paginação com total, página atual e navegação.

#### 1.2 Filtros antes da carga pesada
- Aplicar filtros por padrão antes de listar massa completa:
  - período
  - conta/banco
  - tipo (entrada/saída)
  - status (conciliado/não conciliado)
  - obra/centro de custo
- Definir janela inicial padrão (ex.: últimos 30 dias).

#### 1.3 Ordenação e índice no backend
- Ordenação default por data de movimentação (desc).
- Revisar índices no banco para colunas mais consultadas:
  - status_conciliacao
  - data_movimentacao
  - conta_id/banco_id
  - obra_id/centro_custo_id

#### 1.4 Otimização da consulta
- Evitar `SELECT *`; retornar apenas campos visíveis da grade.
- Carregar detalhes expandidos sob demanda (lazy load por linha).
- Reduzir joins desnecessários na listagem principal.

#### 1.5 Otimização de renderização no front
- Usar virtualização de lista/tabela quando aplicável.
- Debounce em busca textual/filtros.
- Evitar re-renderizações integrais da tabela a cada interação.

#### 1.6 Estratégia de carga incremental
- Carregar resumo/contadores primeiro.
- Carregar lista em seguida com skeleton/loading states.
- Permitir continuidade de uso sem bloqueio da interface.

---

## 2) Critérios de aceite (performance)
- Tela abre sem travar com base de **3.000+ não conciliados**.
- Primeira resposta da listagem paginada em tempo aceitável (meta interna definida pelo time).
- Navegação entre páginas sem congelamento.
- Filtros aplicam sem recarregar volume completo.
- Uso de memória do browser estável durante navegação contínua.

---

## 3) Itens funcionais já mapeados (manter no backlog)

### 3.1 Controle de acesso
- Perfil administrador e financeiro.
- Perfil personalizado com permissões por ação (visualizar, criar, editar, excluir, conciliar, aprovar, exportar, anexar).

### 3.2 Cadastros mestres
- Centros de custo + subcategoria.
- Fornecedores (incluindo almoxarifado interno).
- Clientes com titular/representante e responsável financeiro; contato/e-mail/endereço para automações futuras.

### 3.3 Evoluções da conciliação
- Data de competência.
- Itemização (quantidade, unidade, valor unitário, valor total com validação de fechamento).
- Tipo e categoria de despesa/receita.
- Anexo de nota fiscal por lançamento.

### 3.4 Dados e continuidade
- Migração em massa de histórico.
- Rotina de backup e restauração (rollback por data).
- Dashboard/DRE por obra alimentado pela conciliação.

---

## 4) Sequência recomendada de execução

### Sprint imediata (correção crítica)
1. Paginação server-side.
2. Filtros obrigatórios + período padrão.
3. Ajuste de query/índices.
4. Virtualização e otimizações de render no front.

### Sprint seguinte
1. Anexo de nota fiscal.
2. Itemização completa de lançamentos.
3. Regras automáticas de sugestão de conciliação.

### Sprint posterior
1. Migração assistida de histórico.
2. Dashboard financeiro por obra.
3. Automações (cobrança/alertas) e melhorias contratuais.
