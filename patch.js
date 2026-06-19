const fs = require('fs');

// 1. Update backend financial-dashboard.service.ts
const backendService = 'backend/src/financial/dashboard/financial-dashboard.service.ts';
let code = fs.readFileSync(backendService, 'utf8');

// We need to calculate saldoInicialMes.
code = code.replace(
  `const accountsWithBalance =
      await this.getAccountsWithRealTimeBalance(endOfMonth);
    const currentBalance = accountsWithBalance.reduce(
      (acc, curr) => acc + curr.saldo,
      0,
    );`,
  `const accountsWithBalance = await this.getAccountsWithRealTimeBalance(endOfMonth);
    const currentBalance = accountsWithBalance.reduce((acc, curr) => acc + curr.saldo, 0);

    const endOfPrevMonth = new Date(y, m - 1, 0, 23, 59, 59, 999);
    const accountsWithBalanceStart = await this.getAccountsWithRealTimeBalance(endOfPrevMonth);
    const saldoInicialMes = accountsWithBalanceStart.reduce((acc, curr) => acc + curr.saldo, 0);
`
);

code = code.replace(
  `kpis: {
        saldoAtual: currentBalance,
        aReceber: {
          total: recTotal,
          recebido: recReceived,
          pendente: recPending,
        },
        aPagar: { total: payTotal, pago: payPaid, pendente: payPending },
        saldoProjetado: projectedBalance,
      },`,
  `kpis: {
        saldoAtual: currentBalance,
        saldoInicialMes,
        saldoFinalMes: currentBalance,
        aReceber: {
          total: recTotal,
          recebido: recReceived,
          pendente: recPending,
        },
        aPagar: { total: payTotal, pago: payPaid, pendente: payPending },
        saldoProjetado: projectedBalance,
      },
      summary: {
        entradasMes: recTotal,
        recebidoReal: recReceived,
        previstoReceber: recPending,
        saidasMes: payTotal,
      },`
);

fs.writeFileSync(backendService, code);

// 2. Update frontend interface
const frontendService = 'frontend/src/app/services/financial/financial-dashboard.service.ts';
let frontendCode = fs.readFileSync(frontendService, 'utf8');
frontendCode = frontendCode.replace(
  `saldoAtual: number;
        aReceber: { total: number; recebido: number; pendente: number };
        aPagar: { total: number; pago: number; pendente: number };
        saldoProjetado: number;`,
  `saldoAtual: number;
        saldoInicialMes: number;
        saldoFinalMes: number;
        aReceber: { total: number; recebido: number; pendente: number };
        aPagar: { total: number; pago: number; pendente: number };
        saldoProjetado: number;`
);
frontendCode = frontendCode.replace(
  `kpis: {`,
  `summary?: {
        entradasMes: number;
        recebidoReal: number;
        previstoReceber: number;
        saidasMes: number;
    };
    kpis: {`
);

fs.writeFileSync(frontendService, frontendCode);
console.log('Patch successful');
