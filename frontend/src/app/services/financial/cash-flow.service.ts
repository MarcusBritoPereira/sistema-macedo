import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface CashFlowData {
  cards: {
    initialBalance: number;
    totalReceived: number;
    totalSpent: number;
    finalBalance: number;
    receivableClients: number;
    cashBurn: number;
  };
  monthlyReceived: number[];
  clientReceivedVsReceivable: {
    client: string;
    received: number;
    receivable: number;
  }[];
  receivedVsSpent: {
    month: string;
    received: number;
    spent: number;
    balance: number;
  }[];
  expensesByWork: {
    work: string;
    value: number;
  }[];
  averageTicket: number;
  biggestPendingClient: {
    name: string;
    value: number;
  };
  alerts: {
    color: string;
    text: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class CashFlowService {

  getCashFlow(): Observable<CashFlowData> {
    return of({
      cards: {
        initialBalance: 185430,
        totalReceived: 482750,
        totalSpent: 356920,
        finalBalance: 311260,
        receivableClients: 214300,
        cashBurn: 11897
      },

      monthlyReceived: [
        248000, 312500, 287000, 395800, 521400, 446000,
        389700, 472900, 354300, 298600, 331200, 418000
      ],

      clientReceivedVsReceivable: [
        { client: 'Adolpho', received: 85000, receivable: 22000 },
        { client: 'Juliane', received: 62500, receivable: 12500 },
        { client: 'Orlando', received: 71800, receivable: 17200 },
        { client: 'Fábrica', received: 154000, receivable: 39000 },
        { client: 'Patrícia', received: 98300, receivable: 28500 },
        { client: 'Amazonvitta', received: 124700, receivable: 44200 }
      ],

      receivedVsSpent: [
        { month: 'JAN', received: 248000, spent: 205000, balance: 43000 },
        { month: 'FEV', received: 312500, spent: 226000, balance: 86500 },
        { month: 'MAR', received: 287000, spent: 244000, balance: 129500 },
        { month: 'ABR', received: 395800, spent: 301000, balance: 224300 },
        { month: 'MAI', received: 521400, spent: 356000, balance: 389700 },
        { month: 'JUN', received: 546700, spent: 289000, balance: 546700 }
      ],

      expensesByWork: [
        { work: 'Obra Juliane', value: 118000 },
        { work: 'Obra Adolpho', value: 96500 },
        { work: 'Obra Orlando', value: 82300 },
        { work: 'Obra Fábrica', value: 76900 },
        { work: 'Obra Patrícia', value: 61400 },
        { work: 'Obra Amazonvitta', value: 54200 }
      ],

      averageTicket: 80458,

      biggestPendingClient: {
        name: 'Amazonvitta',
        value: 44200
      },

      alerts: [
        { color: 'green', text: 'R$ 58.700,00 em recebimentos previstos para os próximos 7 dias' },
        { color: 'red', text: 'R$ 42.300,00 em pagamentos críticos na próxima semana' },
        { color: 'orange', text: 'Obra Juliane concentrou 33% das despesas do período' },
        { color: 'blue', text: 'Saldo projetado para o fim do mês: R$ 356.900,00' }
      ]
    });
  }
}
