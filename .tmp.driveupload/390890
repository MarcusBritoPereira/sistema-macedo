import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList,
  IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton,
  IonDatetimeButton, IonModal, IonDatetime, IonSpinner, ModalController, IonFab, IonFabButton, IonFabList
} from '@ionic/angular/standalone';
import { FinancialDashboardService, OperationalDashboardResponse } from '../../services/financial/financial-dashboard.service';
import { addIcons } from 'ionicons';
import {
  business, ellipsisHorizontal, alertCircleOutline, speedometerOutline, pieChartOutline, pricetagOutline, constructOutline, trendingUpOutline, trendingDownOutline, cashOutline, statsChartOutline
} from 'ionicons/icons';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BaseChartDirective,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList,
    IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton,
    IonDatetimeButton, IonModal, IonDatetime, IonSpinner, IonFab, IonFabButton, IonFabList
  ]
})
export class DashboardPage implements OnInit {
  operationalData: OperationalDashboardResponse | null = null;
  loading = false;

  // Chart 1: Daily Flow (Mixed)
  public dailyFlowChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    }
  };
  public dailyFlowChartData: ChartData<'bar' | 'line'> = {
    labels: [],
    datasets: []
  };

  // Chart 2: Sales (Bar)
  public salesChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { display: false }
    }
  };
  public salesChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  // Chart 3: Cost Center Expenses (Doughnut)
  public costCenterChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#F8FAFC',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = (context.raw as number) || 0;
            return ` ${label}: ${this.formatCurrency(value)}`;
          }
        }
      }
    }
  };
  public costCenterChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };

  constructor(
    private dashboardService: FinancialDashboardService
  ) {
    addIcons({ 
      business, 
      ellipsisHorizontal, 
      alertCircleOutline, 
      speedometerOutline, 
      pieChartOutline, 
      pricetagOutline, 
      constructOutline, 
      trendingUpOutline, 
      trendingDownOutline, 
      cashOutline,
      statsChartOutline
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.dashboardService.getOperationalDashboard().subscribe({
      next: (data) => {
        this.operationalData = data;
        this.setupCharts(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard', err);
        this.loading = false;
      }
    });
  }

  setupCharts(data: OperationalDashboardResponse) {
    // 1. Daily Flow Chart
    if (data.dailyFlow) {
      const labels = data.dailyFlow.map(d => d.label);
      const recebs = data.dailyFlow.map(d => d.recebimentos);
      const pags = data.dailyFlow.map(d => d.pagamentos);
      const saldo = data.dailyFlow.map(d => d.saldo);

      this.dailyFlowChartData = {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Saldo',
            data: saldo,
            borderColor: '#1E3A8A', // Blue Royal
            backgroundColor: '#1E3A8A',
            pointBackgroundColor: '#fff',
            pointBorderColor: '#1E3A8A',
            borderWidth: 2,
            tension: 0.4,
            order: 1
          },
          {
            type: 'bar',
            label: 'Recebimentos',
            data: recebs,
            backgroundColor: '#60A5FA', // Blue Light
            borderRadius: 4,
            barPercentage: 0.6,
            order: 2
          },
          {
            type: 'bar',
            label: 'Pagamentos',
            data: pags,
            backgroundColor: '#2563EB', // Blue Dark (Using darker blue for Payments as per image palette hint, usually red but image shows blue/purple shades or maybe my analysis is off. The image legend says "Recebimentos, Pagamentos, Saldo". The bars are Light Blue and Dark Blue. Let's stick to Blues as requested by image style.)
            // Wait, standard finance is Green/Red. But the image is VERY blue/cyan.
            // Let's use the colors from SCSS.
            borderRadius: 4,
            barPercentage: 0.6,
            order: 3
          }
        ]
      };
    }

    // 2. Sales Chart
    if (data.monthlyHistory) {
      // Re-sort if needed, but backend sends last 6 months descending in creation, 
      // check backend logic: "for i=5; i>=0" -> d is months ago. So it pushes oldest first?
      // "d = new Date(now... - i)". i=5 (5 months ago).. i=0 (current). 
      // Yes, pushes oldest first.

      const salesLabels = data.monthlyHistory.map(h => h.label);
      const salesValues = data.monthlyHistory.map(h => h.valor);

      this.salesChartData = {
        labels: salesLabels,
        datasets: [
          {
            label: 'Faturamento',
            data: salesValues,
            backgroundColor: '#0EA5E9', // Blue Sky
            borderRadius: 4,
            barPercentage: 0.6
          }
        ]
      };
    }

    // 3. Cost Center Expenses Chart
    if (data.costCenterKpis?.expensesByCostCenter) {
      const expenses = data.costCenterKpis.expensesByCostCenter;
      const ccLabels = expenses.map(e => e.nome);
      const ccValues = expenses.map(e => e.total);
      const ccColors = expenses.map(e => e.cor || '#64748B');

      this.costCenterChartData = {
        labels: ccLabels,
        datasets: [
          {
            data: ccValues,
            backgroundColor: ccColors,
            hoverBackgroundColor: ccColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }
        ]
      };
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }
}
