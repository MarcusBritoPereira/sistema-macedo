import { Component, OnInit } from '@angular/core';
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
  IonToggle,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
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
  layersOutline,
  refreshOutline,
  eyeOutline,
  printOutline
} from 'ionicons/icons';
import { ReportsService, ReportDefinition, ReportGenerationResponse } from '../../services/financial/reports.service';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { CostCentersService, CostCenter } from '../../services/financial/cost-centers.service';
import { ReportViewerComponent, ReportData } from './components/report-viewer/report-viewer.component';

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
    IonToggle,
    IonSpinner,
    ReportViewerComponent
  ]
})
export class ReportsPage implements OnInit {
  reports: ReportDefinition[] = [];
  bankAccounts: BankAccount[] = [];
  costCenters: CostCenter[] = [];
  selectedReports = new Set<string>();
  selectedPeriod = 'month';
  startDate = '';
  endDate = '';
  selectedAccount = 'all';
  selectedCostCenter = 'all';
  includeProvisional = true;
  loadingReports = true;
  loadingFilters = true;
  generating = false;
  lastGeneration: ReportGenerationResponse | null = null;

  viewingReport: any = null;
  reportData: ReportData | null = null;
  isModalOpen = false;

  constructor(
    private reportsService: ReportsService,
    private financialService: FinancialService,
    private costCentersService: CostCentersService,
    private toastCtrl: ToastController
  ) {
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
      layersOutline,
      refreshOutline,
      eyeOutline,
      printOutline
    });
  }

  ngOnInit() {
    this.updateDatesFromPeriod();
    this.loadReports();
    this.loadFilters();
  }

  loadReports() {
    this.loadingReports = true;
    this.reportsService.getReports().subscribe({
      next: (reports) => {
        this.reports = reports;
        const defaults = reports.filter(report => report.defaultSelected).map(report => report.id);
        this.selectedReports = new Set(defaults);
        this.loadingReports = false;
      },
      error: () => {
        this.loadingReports = false;
        this.showToast('Não foi possível carregar o catálogo de relatórios.', 'danger');
      }
    });
  }

  loadFilters() {
    this.loadingFilters = true;
    forkJoin({
      accounts: this.financialService.getBankAccounts(),
      costCenters: this.costCentersService.findAll()
    }).subscribe({
      next: ({ accounts, costCenters }) => {
        this.bankAccounts = accounts;
        this.costCenters = costCenters;
        this.loadingFilters = false;
      },
      error: () => {
        this.loadingFilters = false;
        this.showToast('Não foi possível carregar contas e centros de custo.', 'warning');
      }
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

  selectAll() {
    this.selectedReports = new Set(this.reports.map(report => report.id));
  }

  clearSelection() {
    this.selectedReports.clear();
  }

  updateDatesFromPeriod() {
    if (this.selectedPeriod === 'custom') {
      return;
    }

    const today = new Date();
    let start: Date;
    let end: Date;

    if (this.selectedPeriod === 'quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
      end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
    } else if (this.selectedPeriod === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
  }

  applyFilters() {
    this.updateDatesFromPeriod();
    this.showToast('Filtros atualizados.');
  }

  generateReports() {
    if (this.selectedReports.size === 0) {
      this.showToast('Selecione ao menos um relatório para continuar.', 'warning');
      return;
    }

    this.generating = true;
    const payload = {
      reportIds: Array.from(this.selectedReports),
      filters: {
        period: this.selectedPeriod,
        startDate: this.startDate || null,
        endDate: this.endDate || null,
        accountId: this.selectedAccount !== 'all' ? this.selectedAccount : null,
        costCenterId: this.selectedCostCenter !== 'all' ? this.selectedCostCenter : null,
        includeProvisional: this.includeProvisional
      }
    };

    this.reportsService.generateReports(payload).subscribe({
      next: (response) => {
        this.lastGeneration = response;
        this.generating = false;

        // Auto-open if DRE is present and has data
        const dre = response.reports.find(r => r.id === 'dre' && r.data);
        if (dre) {
          this.viewReport(dre);
        } else {
          this.showToast(response.message ?? 'Relatórios gerados com sucesso!', 'success');
        }
      },
      error: () => {
        this.generating = false;
        this.showToast('Não foi possível gerar os relatórios. Tente novamente.', 'danger');
      }
    });
  }

  viewReport(report: any) {
    if (report.data) {
      this.viewingReport = report;
      this.reportData = report.data;
      this.isModalOpen = true;
    } else {
      this.showToast('Este relatório não possui visualização disponível.', 'medium');
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.viewingReport = null;
    this.reportData = null;
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
