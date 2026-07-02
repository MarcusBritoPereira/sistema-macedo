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
  IonIcon,
  IonBadge,
  IonList,
  IonToggle,
  IonSpinner,
  IonSearchbar,
  IonModal,
  IonDatetime,
  IonDatetimeButton,
  IonSkeletonText,
  ToastController
} from '@ionic/angular/standalone';
import { forkJoin, of, catchError } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  calendarOutline,
  filterOutline,
  downloadOutline,
  analyticsOutline,
  checkmarkCircleOutline,
  refreshOutline,
  eyeOutline,
  printOutline,
  searchOutline,
  sparklesOutline,
  alertCircleOutline,
  fileTrayFullOutline,
  gridOutline,
} from 'ionicons/icons';
import { ReportsService, ReportDefinition, ReportGenerationResponse } from '../../services/financial/reports.service';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { CostCentersService, CostCenter } from '../../services/financial/cost-centers.service';
import { ReportViewerComponent, ReportData } from './components/report-viewer/report-viewer.component';

type PresetPeriod = 'month' | 'quarter' | 'year' | 'custom';

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
    IonIcon,
    IonBadge,
    IonList,
    IonToggle,
    IonSpinner,
    IonSearchbar,
    IonModal,
    IonDatetime,
    IonDatetimeButton,
    IonSkeletonText,
    ReportViewerComponent
  ]
})
export class ReportsPage implements OnInit {
  reports: ReportDefinition[] = [];
  bankAccounts: BankAccount[] = [];
  costCenters: CostCenter[] = [];
  selectedReports = new Set<string>();

  selectedPeriod: PresetPeriod = 'month';
  startDate = '';
  endDate = '';
  selectedAccount = 'all';
  selectedCostCenter = 'all';
  includeProvisional = true;
  reportSearch = '';

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
      calendarOutline,
      filterOutline,
      downloadOutline,
      analyticsOutline,
      checkmarkCircleOutline,
      refreshOutline,
      eyeOutline,
      printOutline,
      searchOutline,
      sparklesOutline,
      alertCircleOutline,
      fileTrayFullOutline,
      gridOutline
    });
  }

  ngOnInit() {
    this.updateDatesFromPeriod();
    this.reloadPageData();
  }

  reloadPageData() {
    this.loadReports();
    this.loadFilters();
  }

  loadReports() {
    this.loadingReports = true;
    this.reportsService.getReports().subscribe({
      next: (reports) => {
        this.reports = reports;

        if (this.selectedReports.size === 0) {
          const defaults = reports.filter(report => report.defaultSelected).map(report => report.id);
          this.selectedReports = new Set(defaults);
        } else {
          const existingIds = new Set(reports.map(report => report.id));
          this.selectedReports = new Set(Array.from(this.selectedReports).filter(id => existingIds.has(id)));
        }

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
      accounts: this.financialService.getBankAccounts().pipe(catchError(() => of([]))),
      costCenters: this.costCentersService.findAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ accounts, costCenters }) => {
        this.bankAccounts = accounts;
        this.costCenters = costCenters;
        this.loadingFilters = false;
      },
      error: () => {
        this.loadingFilters = false;
        // fallback in case of catastrophic failure (not captured by individual catchErrors)
        this.showToast('Não foi possível carregar as opções de filtros do relatório.', 'warning');
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

  get filteredReports() {
    const search = this.reportSearch.trim().toLowerCase();
    if (!search) {
      return this.reports;
    }

    return this.reports.filter((report) => {
      const haystack = [
        report.title,
        report.description,
        report.category,
        ...(report.tags ?? []),
        ...(report.highlights ?? [])
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });
  }

  get selectedCount() {
    return this.selectedReports.size;
  }

  get activeFilterCount() {
    return [
      this.selectedAccount !== 'all',
      this.selectedCostCenter !== 'all',
      this.includeProvisional
    ].filter(Boolean).length;
  }

  get periodLabel() {
    const map: Record<PresetPeriod, string> = {
      month: 'Mês atual',
      quarter: 'Trimestre',
      year: 'Ano corrente',
      custom: 'Personalizado'
    };

    return map[this.selectedPeriod];
  }

  get periodDateLabel() {
    const start = this.normalizeDate(this.startDate);
    const end = this.normalizeDate(this.endDate);

    if (!start || !end) {
      return 'Escolha as datas para continuar';
    }

    return `${this.formatDisplayDate(start)} até ${this.formatDisplayDate(end)}`;
  }

  get filterSummary() {
    const account = this.selectedAccount === 'all' ? 'todas as contas' : 'conta selecionada';
    const costCenter = this.selectedCostCenter === 'all' ? 'todos os centros' : 'centro selecionado';
    const provisional = this.includeProvisional ? 'com provisões' : 'sem provisões';

    return `${this.periodLabel} • ${account} • ${costCenter} • ${provisional}`;
  }

  get canGenerate() {
    return !this.generating && !this.loadingReports && this.selectedReports.size > 0 && this.hasValidDateRange;
  }

  get exportReadyCount() {
    return this.lastGeneration?.reports.filter(report => report.status === 'ready' && report.data).length ?? 0;
  }

  get exportHint() {
    if (!this.lastGeneration) {
      return 'Gere um pacote para habilitar PDF, Excel e impressão.';
    }

    if (this.exportReadyCount === 0) {
      return 'Nenhum relatório pronto para exportação no último pacote.';
    }

    return `${this.exportReadyCount} relatório(s) prontos para exportar.`;
  }

  get hasValidDateRange() {
    const start = this.normalizeDate(this.startDate);
    const end = this.normalizeDate(this.endDate);

    if (!start || !end) {
      return false;
    }

    return new Date(start) <= new Date(end);
  }

  selectAllFiltered() {
    this.filteredReports.forEach(report => this.selectedReports.add(report.id));
  }

  selectRecommended() {
    const recommended = this.reports.filter(report => report.defaultSelected);
    const reportsToSelect = recommended.length > 0 ? recommended : this.reports.slice(0, 3);
    this.selectedReports = new Set(reportsToSelect.map(report => report.id));
  }

  clearSelection() {
    this.selectedReports.clear();
  }

  onPeriodChange() {
    this.updateDatesFromPeriod();
  }

  onCustomDateChange() {
    this.selectedPeriod = 'custom';
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
    if (!this.hasValidDateRange) {
      this.showToast('Revise o período: a data inicial deve ser menor ou igual à final.', 'warning');
      return;
    }

    this.showToast('Filtros prontos para geração.');
  }

  generateReports() {
    if (this.selectedReports.size === 0) {
      this.showToast('Selecione ao menos um relatório para continuar.', 'warning');
      return;
    }

    if (!this.hasValidDateRange) {
      this.showToast('Período inválido. Ajuste as datas para continuar.', 'warning');
      return;
    }

    this.generating = true;

    const payload = {
      reportIds: Array.from(this.selectedReports),
      filters: {
        period: this.selectedPeriod,
        startDate: this.normalizeDate(this.startDate),
        endDate: this.normalizeDate(this.endDate),
        accountId: this.selectedAccount !== 'all' ? this.selectedAccount : null,
        costCenterId: this.selectedCostCenter !== 'all' ? this.selectedCostCenter : null,
        includeProvisional: this.includeProvisional
      }
    };

    this.reportsService.generateReports(payload).subscribe({
      next: (response) => {
        this.lastGeneration = response;
        this.generating = false;

        const ready = response.reports.find(r => r.status === 'ready' && r.data);
        if (ready) {
          this.viewReport(ready);
        }

        this.showToast(response.message ?? `Pacote gerado com ${response.count} relatório(s).`, 'success');
      },
      error: () => {
        this.generating = false;
        this.showToast('Não foi possível gerar os relatórios. Tente novamente.', 'danger');
      }
    });
  }



  exportPackage(format: 'pdf' | 'excel' | 'print') {
    const readyReports = this.lastGeneration?.reports.filter(report => report.status === 'ready' && report.data) ?? [];

    if (readyReports.length === 0) {
      this.showToast('Gere ao menos um relatório antes de exportar.', 'warning');
      return;
    }

    if (format === 'excel') {
      this.downloadPackageExcel(readyReports);
      this.showToast('Arquivo Excel gerado para o pacote de relatórios.', 'success');
      return;
    }

    this.openPrintablePackage(readyReports, format === 'print');
  }

  private downloadPackageExcel(reports: any[]) {
    const workbookHtml = reports.map(report => this.reportToHtmlTable(report)).join('<br><br>');
    const html = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>${workbookHtml}</body>
      </html>
    `;
    this.downloadBlob(html, `pacote_relatorios_${this.todayStamp()}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  private openPrintablePackage(reports: any[], autoPrint: boolean) {
    const content = reports.map(report => this.reportToPrintableHtml(report)).join('<div class="page-break"></div>');
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');

    if (!printWindow) {
      this.showToast('O navegador bloqueou a janela de impressão/exportação.', 'warning');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Pacote de relatórios - Sistema Macedo</title>
          <style>
            body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
            .report-cover { border-bottom: 2px solid #2563eb; margin-bottom: 24px; padding-bottom: 16px; }
            h1 { font-size: 26px; margin: 0 0 6px; }
            h2 { color: #1d4ed8; font-size: 20px; margin: 24px 0 10px; }
            .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
            table { border-collapse: collapse; margin-top: 12px; width: 100%; }
            th { background: #eff6ff; color: #1d4ed8; text-align: left; }
            th, td { border: 1px solid #dbeafe; padding: 8px; }
            td.value { text-align: right; white-space: nowrap; }
            .summary { display: grid; gap: 8px; grid-template-columns: repeat(2, 1fr); margin: 12px 0; }
            .summary div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
            .page-break { break-after: page; page-break-after: always; }
            @media print { body { margin: 18mm; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:10px 14px;border-radius:10px;border:1px solid #2563eb;background:#2563eb;color:white;font-weight:700;">Imprimir / salvar PDF</button>
          <section class="report-cover">
            <h1>Pacote executivo de relatórios</h1>
            <div class="meta">Sistema Macedo • ${this.periodDateLabel} • ${reports.length} relatório(s) • Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          </section>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();

    if (autoPrint) {
      printWindow.focus();
      printWindow.print();
    }
  }

  private reportToHtmlTable(report: any) {
    const rows = report.data?.details ?? [];
    return `
      <table>
        <thead><tr><th colspan="3">${this.escapeHtml(report.title)}</th></tr><tr><th>Descrição</th><th>Nível</th><th>Valor</th></tr></thead>
        <tbody>${rows.map((row: any) => `<tr><td>${this.escapeHtml(row.label)}</td><td>${row.level ?? 0}</td><td>${Number(row.value ?? 0).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
    `;
  }

  private reportToPrintableHtml(report: any) {
    const summary = report.data?.summary ?? {};
    const rows = report.data?.details ?? [];
    const summaryEntries = Object.entries(summary).filter(([, value]) => typeof value === 'number' || typeof value === 'string').slice(0, 8);

    return `
      <section>
        <h2>${this.escapeHtml(report.title)}</h2>
        <div class="meta">${this.escapeHtml(this.periodLabel)} • ${this.escapeHtml(this.periodDateLabel)}</div>
        ${summaryEntries.length ? `<div class="summary">${summaryEntries.map(([key, value]) => `<div><strong>${this.escapeHtml(key)}</strong><br>${this.escapeHtml(String(value))}</div>`).join('')}</div>` : ''}
        <table>
          <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
          <tbody>${rows.map((row: any) => `<tr><td>${'&nbsp;'.repeat((row.level ?? 0) * 4)}${this.escapeHtml(row.label)}</td><td class="value">${this.formatMoney(row.value ?? 0)}</td></tr>`).join('')}</tbody>
        </table>
      </section>
    `;
  }

  private downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  private todayStamp() {
    return new Date().toISOString().split('T')[0];
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
  }

  viewReport(report: any) {
    if (report?.data) {
      this.viewingReport = report;
      this.reportData = report.data;
      this.isModalOpen = true;
      return;
    }

    this.showToast('Este relatório ainda não possui visualização disponível.', 'medium');
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

  private normalizeDate(dateValue: string | null | undefined) {
    if (!dateValue) {
      return null;
    }

    return dateValue.split('T')[0] || null;
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDisplayDate(dateValue: string) {
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }
}
