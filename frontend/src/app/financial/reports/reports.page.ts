import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonChip,
  IonIcon,
  IonBadge,
  IonList,
  IonDatetimeButton,
  IonModal,
  IonDatetime,
  IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  cashOutline,
  pieChartOutline,
  barChartOutline,
  walletOutline,
  calendarOutline,
  filterOutline,
  downloadOutline,
  analyticsOutline,
  checkmarkCircleOutline,
  layersOutline
} from 'ionicons/icons';

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  cadence: string;
  category: string;
  tags: string[];
  icon: string;
  highlights: string[];
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonChip,
    IonIcon,
    IonBadge,
    IonList,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonToggle
  ]
})
export class ReportsPage {
  reports: ReportDefinition[] = [
    {
      id: 'dre',
      title: 'DRE (Resultado do Exercício)',
      description: 'Mostra rentabilidade, margem e evolução do resultado no período selecionado.',
      cadence: 'Mensal',
      category: 'Performance',
      tags: ['Essencial', 'Contábil'],
      icon: 'pie-chart-outline',
      highlights: ['Receitas vs. despesas', 'Margem bruta e líquida', 'Comparativo mês a mês']
    },
    {
      id: 'cashflow',
      title: 'Fluxo de Caixa',
      description: 'Visibilidade do caixa projetado, entradas e saídas por período.',
      cadence: 'Diário / Semanal',
      category: 'Liquidez',
      tags: ['Essencial', 'Operacional'],
      icon: 'cash-outline',
      highlights: ['Saldo inicial e final', 'Projeções futuras', 'Alertas de falta de caixa']
    },
    {
      id: 'balance',
      title: 'Balanço Patrimonial',
      description: 'Fotografia dos ativos, passivos e patrimônio líquido.',
      cadence: 'Mensal',
      category: 'Estrutura',
      tags: ['Essencial', 'Contábil'],
      icon: 'layers-outline',
      highlights: ['Saúde financeira', 'Capital de giro', 'Endividamento']
    },
    {
      id: 'aging',
      title: 'Aging de Contas (Pagar/Receber)',
      description: 'Distribuição por vencimento para evitar atrasos e melhorar cobrança.',
      cadence: 'Semanal',
      category: 'Risco',
      tags: ['Essencial', 'Cobrança'],
      icon: 'calendar-outline',
      highlights: ['Vencidos', 'A vencer', 'Prioridade de cobrança']
    },
    {
      id: 'bank-position',
      title: 'Posição Bancária',
      description: 'Saldos por banco/conta com comparativo diário.',
      cadence: 'Diário',
      category: 'Liquidez',
      tags: ['Operacional'],
      icon: 'wallet-outline',
      highlights: ['Saldo disponível', 'Conta principal', 'Conciliação rápida']
    },
    {
      id: 'budget',
      title: 'Orçado x Realizado',
      description: 'Acompanha desvios e eficiência das áreas e centros de custo.',
      cadence: 'Mensal',
      category: 'Controle',
      tags: ['Gestão'],
      icon: 'bar-chart-outline',
      highlights: ['Variações por categoria', 'Alertas de estouro', 'Evolução orçamentária']
    },
    {
      id: 'cost-centers',
      title: 'Desempenho por Centro de Custo',
      description: 'Consolida resultados e despesas por unidades de negócio.',
      cadence: 'Mensal',
      category: 'Gestão',
      tags: ['Gerencial'],
      icon: 'analytics-outline',
      highlights: ['Ranking por contribuição', 'Comparativo entre áreas', 'Top despesas']
    },
    {
      id: 'taxes',
      title: 'Resumo de Impostos',
      description: 'Mapeia obrigações, pagamentos e provisões fiscais.',
      cadence: 'Mensal',
      category: 'Compliance',
      tags: ['Fiscal'],
      icon: 'document-text-outline',
      highlights: ['Impostos a pagar', 'Histórico de recolhimento', 'Alertas de vencimento']
    }
  ];

  selectedReports = new Set<string>(['dre', 'cashflow', 'aging']);
  selectedPeriod = 'month';
  startDate = '';
  endDate = '';
  selectedAccount = 'all';
  selectedCostCenter = 'all';
  includeProvisional = true;

  constructor() {
    addIcons({
      documentTextOutline,
      cashOutline,
      pieChartOutline,
      barChartOutline,
      walletOutline,
      calendarOutline,
      filterOutline,
      downloadOutline,
      analyticsOutline,
      checkmarkCircleOutline,
      layersOutline
    });
  }

  toggleReport(reportId: string) {
    if (this.selectedReports.has(reportId)) {
      this.selectedReports.delete(reportId);
    } else {
      this.selectedReports.add(reportId);
    }
  }

  isSelected(reportId: string) {
    return this.selectedReports.has(reportId);
  }

  get selectedLabels() {
    return this.reports
      .filter(report => this.selectedReports.has(report.id))
      .map(report => report.title);
  }
}
