import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { addIcons } from 'ionicons';
import {
  businessOutline, briefcaseOutline, calendarOutline, chevronDownOutline,
  logoUsd, arrowDownOutline, pieChartOutline, walletOutline, statsChartOutline,
  pricetagOutline, personOutline, hammerOutline, timeOutline, clipboardOutline
} from 'ionicons/icons';

import { ObrasService, Obra } from '../../services/financial/obras.service';
import { FinancialService } from '../../services/financial/financial';
import { ReportsService } from '../../services/financial/reports.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, BaseChartDirective]
})
export class ReportsPage implements OnInit {

  obras: Obra[] = [];
  centrosCusto: any[] = [];
  
  filters = {
    obraId: 'all',
    centroCustoId: 'all',
    startDate: '',
    endDate: ''
  };

  kpis = [
    { label: 'Valor total da obra', value: 'R$ 0,00', icon: 'logo-usd', color: 'primary' },
    { label: 'Valor gasto na obra', value: 'R$ 0,00', icon: 'arrow-down', color: 'primary' },
    { label: 'Porcentagem gasta', value: '0%', icon: 'pie-chart', color: 'primary' },
    { label: 'Porcentagem a receber', value: '100%', icon: 'pie-chart', color: 'primary' },
    { label: 'Saldo da obra', value: 'R$ 0,00', icon: 'wallet', color: 'primary' },
    { label: 'Custo médio mensal', value: 'R$ 0,00', icon: 'stats-chart', color: 'primary' }
  ];

  summary = [
    { label: 'Maior custo em material', value: '-', icon: 'pricetag', color: 'success' },
    { label: 'Maior custo de mão de obra', value: '-', icon: 'person', color: 'warning' },
    { label: 'Etapa com maior consumo', value: '-', icon: 'hammer', color: 'purple' },
    { label: 'Mês com maior gasto', value: '-', icon: 'time', color: 'primary' }
  ];

  donutStats = {
    material: 0,
    labor: 0,
    materialPerc: '0%',
    laborPerc: '0%'
  };

  // Chart Configurations
  materialChart: any;
  laborChart: any;
  donutChart: any;
  stageChart: any;
  monthlyChart: any;

  commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => 'R$ ' + context.raw.toLocaleString('pt-BR')
        }
      }
    }
  };

  currentDate: string;

  constructor(
    private obrasService: ObrasService,
    private financialService: FinancialService,
    private reportsService: ReportsService
  ) {
    addIcons({
      businessOutline, briefcaseOutline, calendarOutline, chevronDownOutline,
      'logo-usd': logoUsd, 'arrow-down': arrowDownOutline, 'pie-chart': pieChartOutline,
      'wallet': walletOutline, 'stats-chart': statsChartOutline, 'pricetag': pricetagOutline,
      'person': personOutline, 'hammer': hammerOutline, 'time': timeOutline, 'clipboard-outline': clipboardOutline
    });
    
    const now = new Date();
    this.currentDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  }

  ngOnInit() {
    this.loadFilters();
    this.loadDashboardData();
  }

  loadFilters() {
    this.obrasService.getAll().subscribe(obras => {
      this.obras = obras;
    });
    this.financialService.getCostCenters().subscribe(ccs => {
      this.centrosCusto = ccs;
    });
  }

  onFilterChange() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.reportsService.getDashboardData(this.filters).subscribe((data: any) => {
      // Update KPIs
      this.kpis[0].value = 'R$ ' + data.kpis.valorTotalObra.toLocaleString('pt-BR');
      this.kpis[1].value = 'R$ ' + data.kpis.valorGastoObra.toLocaleString('pt-BR');
      this.kpis[2].value = data.kpis.porcentagemGasta + '%';
      this.kpis[3].value = data.kpis.porcentagemReceber + '%';
      this.kpis[4].value = 'R$ ' + data.kpis.saldoObra.toLocaleString('pt-BR');
      this.kpis[5].value = 'R$ ' + data.kpis.custoMedioMensal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

      // Update Summary
      this.summary[0].value = data.summary.maxMaterial;
      this.summary[1].value = data.summary.maxLabor;
      this.summary[2].value = data.summary.maxStage;
      this.summary[3].value = data.summary.maxMonth;

      // Update Donut Stats
      const total = data.charts.classification.material + data.charts.classification.labor;
      this.donutStats.material = data.charts.classification.material;
      this.donutStats.labor = data.charts.classification.labor;
      this.donutStats.materialPerc = total > 0 ? Math.round((this.donutStats.material / total) * 100) + '%' : '0%';
      this.donutStats.laborPerc = total > 0 ? Math.round((this.donutStats.labor / total) * 100) + '%' : '0%';

      this.initCharts(data.charts);
    });
  }

  initCharts(chartsData: any) {
    const primaryColor = '#0b63f6';
    const lightBlue = '#87bdfb';
    
    this.materialChart = {
      labels: chartsData.material.labels,
      datasets: [{
        data: chartsData.material.data,
        backgroundColor: primaryColor,
        borderRadius: 4,
        barPercentage: 0.6
      }],
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (val: any) => 'R$ ' + (val / 1000).toString() + 'k'
            }
          }
        }
      }
    };

    this.laborChart = {
      labels: chartsData.labor.labels,
      datasets: [{
        data: chartsData.labor.data,
        backgroundColor: primaryColor,
        borderRadius: 4,
        barPercentage: 0.6
      }],
      options: {
        ...this.commonOptions,
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: { callback: (val: any) => 'R$ ' + (val / 1000).toString() + 'k' }
          },
          y: { grid: { display: false } }
        }
      }
    };

    this.donutChart = {
      labels: ['Material', 'Mão de obra'],
      datasets: [{
        data: [chartsData.classification.material, chartsData.classification.labor],
        backgroundColor: [primaryColor, lightBlue],
        borderWidth: 0,
        cutout: '70%'
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = 'R$ ' + context.raw.toLocaleString('pt-BR');
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    };

    this.stageChart = {
      labels: chartsData.stage.labels,
      datasets: [{
        data: chartsData.stage.data,
        backgroundColor: primaryColor,
        borderRadius: 4,
        barPercentage: 0.5
      }],
      options: {
        ...this.commonOptions,
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { callback: (val: any) => 'R$ ' + (val / 1000).toString() + 'k' }
          }
        }
      }
    };

    this.monthlyChart = {
      labels: chartsData.monthly.labels,
      datasets: [
        {
          type: 'line',
          data: chartsData.monthly.data,
          borderColor: '#0f172a',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#0f172a',
          tension: 0.3,
          order: 1
        },
        {
          type: 'bar',
          data: chartsData.monthly.data,
          backgroundColor: lightBlue,
          borderRadius: 4,
          barPercentage: 0.5,
          order: 2
        }
      ],
      options: {
        ...this.commonOptions,
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { callback: (val: any) => 'R$ ' + (val / 1000).toString() + 'k' }
          }
        }
      }
    };
  }
}
