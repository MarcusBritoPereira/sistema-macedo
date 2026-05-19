# Plano de Implementação: Importação de Extrato Bancário via CSV

## Goal
Permitir a importação direta de arquivos .CSV de extratos de diversos bancos brasileiros com detecção e normalização inteligente de cabeçalhos, datas e valores, integrado na tela de Conciliação Bancária.

## Tasks
- [x] Task 1: Criar método de upload no service do Frontend (`banking-integration.service.ts`) e atualizar o HTML/TS da tela de conciliação para incluir o botão de importação de CSV abaixo do OFX.
- [x] Task 2: Criar a rota POST `upload-csv` no `BankingIntegrationController` do NestJS para receber o arquivo.
- [x] Task 3: Implementar o processador inteligente `importCsv` em `BankingIntegrationService` que decodifica o buffer e usa `csv-parse` para mapear de forma flexível as colunas de data, descrição, valor e tipo.
- [x] Task 4: Testar a integração do upload, processando diferentes formatos de CSV, validando a inserção dos registros no banco e as respostas visuais no frontend.

## Done When
- [x] O botão "Importar lançamentos via CSV" está visível e funcional na tela de Conciliação.
- [x] Arquivos CSV de bancos com diferentes formatos (cabeçalhos como "Data", "Histórico", "Lançamento", "Valor", separadores `;` ou `,`) são processados perfeitamente.
- [x] Lançamentos importados aparecem na lista de conciliações pendentes.
