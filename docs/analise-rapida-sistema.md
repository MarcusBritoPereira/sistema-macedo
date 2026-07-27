# Análise rápida do sistema

## O que é
O **Sistema Macedo** é uma plataforma de gestão operacional/financeira para empresas, com foco em:
- CRM básico (clientes e fornecedores)
- contratos
- gestão financeira (receitas/despesas)
- DRE, fluxo de caixa, orçamento e relatórios
- integração bancária e conciliação
- trilha de auditoria

## Arquitetura
- **Backend**: NestJS + Prisma + PostgreSQL.
- **Frontend**: Angular + Ionic (SPA com rotas protegidas por autenticação).
- **Infra local**: Docker Compose com PostgreSQL e Redis.

## Principais módulos de negócio
1. **Autenticação e usuários** (roles/permissões).
2. **Clientes/fornecedores/contratos**.
3. **Financeiro central**:
   - lançamentos (receita/despesa)
   - categorias e centros de custo
   - contas bancárias
   - recorrência e rateio
   - conciliação bancária
   - dashboards e relatórios
   - DRE
4. **Auditoria** (histórico de ações).

## Modelo de dados (visão geral)
No Prisma, o domínio está organizado com entidades como:
- `Usuario`, `Perfil`
- `Cliente`, `Fornecedor`, `Contrato`
- `LancamentoFinanceiro` (núcleo financeiro)
- `ContaBancaria`, `IntegracaoBancaria`, `ConciliacaoBancaria`
- estruturas de apoio para orçamento, categoria, centro de custo e rateio

## Conclusão
Trata-se de um **ERP financeiro leve**, orientado a rotina administrativa/financeira: cadastro de clientes/fornecedores, gestão contratual e controle completo do ciclo financeiro (planejado, realizado, conciliado), com visões analíticas (DRE, dashboard, relatórios).
