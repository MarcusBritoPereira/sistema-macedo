# Auditoria UI/UX — Sistema Macedo (Web)

Data: 23/05/2026  
Escopo: análise estática das telas mapeadas pelas rotas e componentes Angular/Ionic.

## 1) Cobertura da análise

Foram analisadas as telas a partir das rotas declaradas (login, dashboard, módulos financeiros, cadastros e usuários), com foco em:
- consistência visual;
- hierarquia da informação;
- espaçamento e alinhamento;
- estados vazios;
- responsividade;
- padrões de formulário e tabelas.

## 2) Achados críticos (prioridade alta)

1. **Inconsistência forte de linguagem visual entre telas**: login usa layout split moderno e paleta específica, enquanto listas/formulários usam estilos utilitários distintos e variação de raio, sombra e tipografia. Impacta percepção de produto “fragmentado”.
2. **Uso de estilos inline em páginas-chave** (ex.: lista de usuários no header e linhas), dificultando padronização, manutenção e design system.
3. **Padrões de formulário misturados**: combinações de `ion-item + floating label`, campos customizados e botões com estilos distintos sem regra única.
4. **Estados vazios básicos e pouco orientativos**: mensagens curtas sem CTA contextual, sem ação de recuperação.
5. **Sinais de tela legado/ociosa**: `home.page.scss` mantém estilos padrão não aderentes ao dashboard atual, indicando dívida visual e potencial confusão de manutenção.

## 3) Evidências por área

### 3.1 Login
- Pontos positivos:
  - Composição moderna em split-layout e narrativa de marca; boa primeira impressão.
  - Botão principal com feedback de loading no submit.
- Falhas:
  - Link “Esqueci minha senha” é placeholder (`href="#"`) sem fluxo real.
  - Dependência de card/marketing oculto em mobile pode reduzir contexto de confiança sem alternativa compacta.

### 3.2 Navegação lateral e arquitetura de informação
- Pontos positivos:
  - Menu colapsável e agrupamento por domínio (Financeiro/Configurações).
- Falhas:
  - Rótulos longos e heterogêneos (ex.: singular/plural e naming desigual), elevando carga cognitiva.
  - Densidade de itens alta sem separação semântica por subtópicos (cadastros vs operação vs análises).
  - No estado colapsado, perda de legibilidade por ocultar labels sem estratégia alternativa robusta (ex.: tooltips persistentes).

### 3.3 Gestão de usuários (lista)
- Pontos positivos:
  - Desktop e mobile têm variação apropriada (tabela e cards).
- Falhas:
  - Header com estilos inline e estrutura não totalmente componentizada.
  - Busca não conectada claramente a estado (falta indicar filtro ativo/contagem/limpar).
  - Estado vazio genérico sem CTA (“criar usuário”, “limpar filtros”, “importar”).

### 3.4 Configuração de usuários (detalhe)
- Pontos positivos:
  - Estrutura de formulário limpa com agrupamento em card.
- Falhas:
  - `ion-select` em `interface="popover"` pode gerar inconsistência de interação em telas menores e dificuldade de discoverability.
  - Ações primária e destrutiva próximas na mesma pilha visual sem reforço de zona de risco.
  - Hierarquia de títulos/subtítulos discreta demais para contexto de “configuração crítica”.

### 3.5 Dashboard e páginas de entrada
- Pontos positivos:
  - Dashboard financeiro possui estrutura rica de KPIs e widgets.
- Falhas:
  - `home.page` e dashboard convivem com padrões de maturidade visual diferentes.
  - Há trecho `<title>` dentro de `ion-content` no dashboard, fora do padrão semântico esperado para SPA e potencial ruído estrutural.

## 4) Problemas transversais (sistema inteiro)

1. **Design tokens não centralizados o suficiente** (cores/espaçamentos/raios variam por página).
2. **Padronização incompleta de tabela/lista/filtro** (cada módulo tende a implementar seu próprio “header + filtro + grid”).
3. **Estados de UI incompletos**: vazio, erro, sem permissão, sem dados por filtro, e loading esquelético não uniformes.
4. **Acessibilidade**:
   - contraste e tamanhos de fonte variam sem baseline explícita;
   - ações ícone-only em alguns contextos sem reforço textual consistente.
5. **Responsividade heterogênea**: parte mobile bem resolvida, parte depende de esconder blocos inteiros sem substituto equivalente de valor.

## 5) Plano de melhoria (roadmap prático)

## Fase 1 — Fundação visual (1 a 2 sprints)
- Criar mini design system (tokens):
  - cores semânticas (`primary`, `success`, `warning`, `danger`, `surface`, `text`);
  - escala de espaçamento (4/8/12/16/24/32);
  - raio padrão (8/12) e sombra padrão (1 ou 2 níveis);
  - tipografia (h1/h2/body/small/caption).
- Remover estilos inline e migrar para classes reutilizáveis.
- Definir padrões oficiais para:
  - cabeçalho de tela;
  - bloco de filtros;
  - tabela desktop;
  - card-list mobile;
  - empty-state.

## Fase 2 — Jornada Login → Navegação → Usuários (1 sprint)
- Login:
  - implementar fluxo real de recuperação de senha;
  - adicionar microcopy de suporte e validação inline clara por campo.
- Menu lateral:
  - reorganizar itens por macrogrupos e reduzir ruído textual;
  - aplicar tooltips no modo colapsado e reforçar estado ativo/subnível.
- Usuários (lista/detalhe):
  - padronizar barra de ações/filtros;
  - enriquecer empty state com CTA primário e secundário;
  - separar ação destrutiva em seção de risco com confirmação contextual.

## Fase 3 — Escala para módulos financeiros e cadastros (2 a 3 sprints)
- Criar biblioteca interna de componentes de tela:
  - `PageHeader`, `FilterBar`, `DataTable`, `MobileCardList`, `EmptyState`, `FormSection`.
- Refatorar módulos por prioridade de uso (Dashboard, Receber/Pagar, Categorias, Fornecedores, Clientes).
- Implantar checklist UX por PR:
  - alinhamento vertical/horizontal;
  - respiro mínimo entre campos e blocos;
  - padrão de botão primário/secundário/destrutivo;
  - coerência de feedbacks (toast, loading, erro).

## Fase 4 — Qualidade contínua (contínuo)
- Definir métricas:
  - tempo para completar tarefas-chave (ex.: criar usuário);
  - taxa de erro em formulário;
  - retrabalho em navegação (voltas/abandono).
- Rodar testes de usabilidade rápidos quinzenais com 5 usuários internos.
- Criar guia de contribuição visual no repositório para evitar regressão.

## 6) Backlog priorizado (Top 12)

1. Implementar tokens globais de UI.
2. Eliminar estilos inline em usuários/listas principais.
3. Padrão único de formulário (inputs, selects, validação, helper text).
4. Padrão único de header + filtros.
5. Empty state padrão com CTA.
6. Fluxo real “esqueci minha senha”.
7. Reorganização da IA do menu lateral.
8. Tooltips no menu colapsado.
9. Padronização de botões destrutivos (zona de risco).
10. Revisão semântica do dashboard (remover estruturas HTML indevidas no conteúdo).
11. Harmonização home/dashboard (ou descontinuar home legado).
12. Checklist de UX obrigatório no PR template.

## 7) Resultado esperado

Com esse plano, o sistema tende a ganhar:
- maior consistência visual e menor curva de aprendizado;
- redução de erros operacionais em formulários;
- percepção de produto mais premium e confiável;
- menor custo de manutenção de front-end no médio prazo.
