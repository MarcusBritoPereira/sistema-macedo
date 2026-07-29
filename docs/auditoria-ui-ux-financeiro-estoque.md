# Auditoria de UI/UX — Financeiro e Estoque

## Escopo e método

A revisão cobriu as rotas, templates e estilos dos módulos `financial` e `stock`, com foco em consistência visual, responsividade, acessibilidade, estados de interface e custo de manutenção. O build de produção foi usado para localizar regressões de template e excesso de CSS.

## Diagnóstico consolidado

| Prioridade | Achado | Impacto | Tratamento |
| --- | --- | --- | --- |
| Alta | O mesmo stylesheet de estoque era compilado em cada página lazy | CSS repetido, componentes acima do orçamento e manutenção divergente | Corrigido: o estilo compartilhado agora é emitido uma vez no bundle global e limitado a `.stock-content` |
| Alta | Alvos de toque podiam ficar menores que 44 px | Dificulta ações em celular e para usuários com limitação motora | Corrigido globalmente para botões Ionic e FABs |
| Alta | Animações/transições ignoravam a preferência de movimento reduzido | Pode causar desconforto e prejudica acessibilidade | Já atendido pela base global com `prefers-reduced-motion` |
| Média | Estoque usa uma base visual compartilhada, mas o financeiro repete estruturas de tabela, toolbar, estados vazios e badges | Inconsistência e alto custo de evolução | Recomenda-se uma segunda etapa para extrair componentes compartilhados sem alterar os fluxos de negócio |
| Média | Existem componentes Ionic importados e não utilizados e optional chaining redundante | Ruído de build e templates mais difíceis de revisar | Registrado para limpeza incremental; não bloqueia o uso |
| Média | Algumas páginas possuem SCSS acima de 10 kB | Aumenta o custo de carregamento das rotas | A centralização do estoque reduz parte do problema; documentos, reconciliação e telas densas ainda precisam ser divididos em componentes |
| Baixa | Há arquivos `.bkp_*` dentro de `src` | Polui busca, revisão e navegação do projeto | Recomenda-se mover para histórico Git ou remover após validação funcional |

## Checklist por módulo

### Financeiro

- Padronizar cabeçalho, barra de filtros, tabela, paginação, loading, vazio e erro em componentes reutilizáveis.
- Manter ação primária à direita no desktop e visível sem rolagem no mobile.
- Garantir rótulo textual ou `aria-label` em ações que exibem somente ícones.
- Preservar contexto após criar, editar, conciliar ou baixar um lançamento (filtros, página e posição de rolagem).
- Exibir confirmação específica para ações irreversíveis e feedback de sucesso/erro junto ao contexto afetado.
- Em valores financeiros, manter alinhamento à direita, sinal, moeda e precisão consistentes.
- Nas telas de DRE, fluxo de caixa e relatórios, fornecer alternativa textual aos gráficos.
- Dividir os estilos de reconciliação e lista financeira por componentes para respeitar o orçamento de CSS.

### Estoque

- A base compartilhada agora está isolada sob `.stock-content`, evitando interferência fora do módulo.
- Os grids mudam de quatro para duas e uma coluna nos breakpoints existentes; tabelas preservam rolagem horizontal no mobile.
- Revisar tabelas muito largas para que a primeira coluna e ações permaneçam identificáveis durante a rolagem.
- Informar unidade de medida em todo campo de quantidade e saldo.
- Diferenciar visual e textualmente rascunho, pendente, aprovado, efetivado e cancelado; cor não deve ser o único indicador.
- Antes de saída, transferência ou ajuste, mostrar local, saldo disponível, quantidade e efeito final.
- Preservar os filtros ao abrir e retornar de detalhes de material, documento, inventário ou solicitação.
- Dividir documentos, locais, materiais, categorias e saldos em componentes menores para reduzir o CSS por rota.

## Critérios de aceite para próximas telas

1. Operável por teclado, com foco visível e ordem lógica.
2. Alvos interativos com no mínimo 44 × 44 px.
3. Layout funcional em 320, 768, 1024 e 1440 px.
4. Estados de carregamento, vazio, erro, sucesso e indisponibilidade previstos.
5. Ação destrutiva com confirmação e consequência descrita.
6. Sem perda de filtros/contexto ao navegar para detalhes.
7. Texto e status não dependem somente de cor ou ícone.
8. Build de produção sem novo excesso de orçamento de CSS.
