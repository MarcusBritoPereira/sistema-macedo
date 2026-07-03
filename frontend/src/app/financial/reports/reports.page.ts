import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  briefcaseOutline,
  calendarOutline,
  chevronDownOutline,
  logoUsd,
  arrowDownOutline,
  pieChartOutline,
  walletOutline,
  statsChartOutline,
  pricetagOutline,
  personOutline,
  hammerOutline,
  timeOutline
} from 'ionicons/icons';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, BaseChartDirective]
})
export class ReportsPage implements OnInit {

  reportFilters = {
    obra: 'Obra Juliane',
    centroCusto: 'Geral',
    periodo: '01/01/2024 - 30/06/2024'
  };

  kpis = [
    { label: 'Valor total da obra', value: 'R$ 1.850.000,00', icon: 'logo-usd', color: 'primary' },
    { label: 'Valor gasto na obra', value: 'R$ 1.128.500,00', icon: 'arrow-down', color: 'primary' },
    { label: 'Porcentagem gasta', value: '61%', icon: 'pie-chart', color: 'primary' },
    { label: 'Porcentagem a receber', value: '39%', icon: 'pie-chart', color: 'primary' },
    { label: 'Saldo da obra', value: 'R$ 721.500,00', icon: 'wallet', color: 'primary' },
    { label: 'Custo médio mensal', value: 'R$ 188.083,33', icon: 'stats-chart', color: 'primary' }
  ];

  summary = [
    { label: 'Maior custo em material', value: 'Concreto Usinado', icon: 'pricetag', color: 'success' },
    { label: 'Maior custo de mão de obra', value: 'Pedreiro', icon: 'person', color: 'warning' },
    { label: 'Etapa com maior consumo', value: 'Estrutura', icon: 'hammer', color: 'purple' },
    { label: 'Mês com maior gasto', value: 'Maio', icon: 'time', color: 'primary' }
  ];

  // Chart Data
  materialCostsData = {
    labels: ['Porcelanato', 'Cimento', 'Cobertura', 'Pintura', 'Ferragens', 'Impermeáveis e telas', 'Aterro', 'Elétrico', 'Madeira', 'Tijolos e blocos', 'Argamassa', 'Hidrossanitário', 'Refrigeração', 'Areia', 'Pregos/pinos/arame recozido', 'Ferramentas/equipamentos', 'Frete', 'Andaimes', 'Rojuma/espacador/cunha', 'Transporte/refeição/saldo', 'Aluguel', 'Adesivos estrutural', 'Impermeabilizantes', 'EPI/EPC/Fardamento'],
    values: [142000, 134000, 118000, 96000, 86000, 72000, 68000, 64000, 52000, 49000, 46000, 38000, 36000, 28000, 24000, 18000, 16000, 14000, 10000, 9000, 7000, 6000, 4000, 3000]
  };

  laborCostsData = {
    labels: ['Mst obras', 'Repetiro', 'Pedreiro', 'Pintor', 'Ajudante', 'Porcelanato', 'Gesseiro', 'Eletricista', 'Carpinteiro', 'Serralheiro', 'Pedras granito', 'Encanador', 'Emp. fundação', 'Calhas, rufos e pingadeiras', 'Ferreiro', 'Almoxarife', 'Estagiário', 'Meio oficial'].reverse(),
    values: [60000, 88000, 158000, 67000, 84000, 76000, 64000, 73000, 46000, 36000, 30000, 32000, 24000, 18000, 18000, 10000, 6000, 5000].reverse()
  };

  stageCostsData = {
    labels: ['Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Revestimentos', 'Pintura', 'Acabamento'],
    values: [200000, 245000, 342000, 216000, 128500, 103500, 68000]
  };

  monthlyCostsData = {
    labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN'],
    values: [80000, 122000, 168500, 201000, 194000, 221500]
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

  constructor() {
    addIcons({
      businessOutline,
      briefcaseOutline,
      calendarOutline,
      chevronDownOutline,
      'logo-usd': logoUsd,
      'arrow-down': arrowDownOutline,
      'pie-chart': pieChartOutline,
      'wallet': walletOutline,
      'stats-chart': statsChartOutline,
      'pricetag': pricetagOutline,
      'person': personOutline,
      'hammer': hammerOutline,
      'time': timeOutline
    });
  }

  ngOnInit() {
    this.initCharts();
  }

  initCharts() {
    const primaryColor = '#0b63f6';
    const lightBlue = '#87bdfb';
    
    // 1. Gráfico de Custo por Material
    this.materialChart = {
      labels: this.materialCostsData.labels,
      datasets: [{
        data: this.materialCostsData.values,
        backgroundColor: primaryColor,
        borderRadius: 4,
        barPercentage: 0.6
      }],
      options: {
        ...this.commonOptions,
        plugins: {
          ...this.commonOptions.plugins,
          datalabels: { display: false } // Optionally we can add chartjs-plugin-datalabels later if needed
        },
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

    // 2. Gráfico de Custo por Mão de Obra
    this.laborChart = {
      labels: this.laborCostsData.labels,
      datasets: [{
        data: this.laborCostsData.values,
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

    // 3. Classificação de Custo
    this.donutChart = {
      labels: ['Material', 'Mão de obra'],
      datasets: [{
        data: [699000, 429500],
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

    // 4. Valor por etapa de obra
    this.stageChart = {
      labels: this.stageCostsData.labels,
      datasets: [{
        data: this.stageCostsData.values,
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

    // 5. Valor por mês de obra
    this.monthlyChart = {
      labels: this.monthlyCostsData.labels,
      datasets: [
        {
          type: 'line',
          data: this.monthlyCostsData.values,
          borderColor: '#0f172a',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#0f172a',
          tension: 0.3,
          order: 1
        },
        {
          type: 'bar',
          data: this.monthlyCostsData.values,
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
