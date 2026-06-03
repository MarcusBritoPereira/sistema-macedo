import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuditLogService, AuditLogItem } from '../../services/financial/audit-log.service';
import {
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher,
    IonRefresherContent, IonCard, IonCardContent, IonBadge, IonGrid, IonRow,
    IonCol, IonButton, IonInput, IonSelect, IonSelectOption, IonPopover,
    IonCheckbox, IonNote, IonChip, ToastController, LoadingController, AlertController,
    IonFooter, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    checkmarkCircleOutline, walletOutline, arrowUpCircle, arrowDownCircle,
    alertCircleOutline, add, chevronBackOutline, chevronForwardOutline,
    arrowUp, arrowDown, filterOutline, receiptOutline, searchOutline,
    printOutline, downloadOutline, cloudUploadOutline, ellipsisVerticalOutline,
    settingsOutline, refreshOutline, barcodeOutline, listCircleOutline,
    timeOutline, gitCompareOutline, chevronDownOutline
} from 'ionicons/icons';
import {
    format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
    selector: 'app-audit-log',
    templateUrl: './audit-log.page.html',
    styleUrls: ['./audit-log.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterModule, IonHeader, IonToolbar, IonButtons,
        IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab,
        IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonCard,
        IonCardContent, IonBadge, IonGrid, IonRow, IonCol, IonButton, IonInput,
        IonSelect, IonSelectOption, IonPopover, IonCheckbox, IonNote, IonChip,
        IonFooter, IonSpinner
    ],
    providers: [CurrencyPipe]
})
export class AuditLogPage implements OnInit {
    Math = Math;
    logs: AuditLogItem[] = [];
    totalLogs = 0;
    currentPage = 1;
    limit = 10;
    totalPages = 1;

    // Filters
    periodFilter: string = 'month';
    startDate?: string;
    endDate?: string;
    searchQuery: string = '';
    loading = false;

    @ViewChild('newPopover') newPopover: any;

    constructor(
        private auditLogService: AuditLogService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private router: Router
    ) {
        addIcons({
            checkmarkCircleOutline, walletOutline, arrowUpCircle, arrowDownCircle,
            alertCircleOutline, add, chevronBackOutline, chevronForwardOutline,
            arrowUp, arrowDown, filterOutline, receiptOutline, searchOutline,
            printOutline, downloadOutline, cloudUploadOutline, ellipsisVerticalOutline,
            settingsOutline, refreshOutline, barcodeOutline, listCircleOutline,
            timeOutline, gitCompareOutline, chevronDownOutline
        });
    }

    ngOnInit() {
        this.loadLogs();
    }

    // ... (rest of methods)

    // NOVA Button logic
    addReceita() {
        if (this.newPopover) this.newPopover.dismiss();
        this.router.navigate(['/financial/receivables/new']);
    }

    addDespesa() {
        if (this.newPopover) this.newPopover.dismiss();
        this.router.navigate(['/financial/payables/new']);
    }

    addTransferencia() {
        this.showToast('Nova Transferência - Em breve', 'primary');
        if (this.newPopover) this.newPopover.dismiss();
    }


    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.altKey) {
            const key = event.key.toLowerCase();
            if (['r', 'd', 't'].includes(key)) {
                event.preventDefault();
                if (key === 'r') this.addReceita();
                if (key === 'd') this.addDespesa();
                if (key === 't') this.addTransferencia();
            }
        }
    }

    async loadLogs(event?: any) {
        this.loading = true;
        const params: any = {
            page: this.currentPage,
            limit: this.limit,
            search: this.searchQuery,
        };

        if (this.periodFilter !== 'all') {
            const range = this.getDateRange();
            params.startDate = range.start.toISOString();
            params.endDate = range.end.toISOString();
        }

        this.auditLogService.getLogs(params).subscribe({
            next: (res) => {
                this.logs = res.items;
                this.totalLogs = res.total;
                this.totalPages = res.totalPages;
                this.loading = false;
                if (event) event.target.complete();
            },
            error: (err) => {
                console.error('Error loading logs', err);
                this.loading = false;
                if (event) event.target.complete();
                this.showToast('Erro ao carregar histórico', 'danger');
            }
        });
    }

    getDateRange() {
        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        switch (this.periodFilter) {
            case 'week':
                start = startOfWeek(now, { locale: ptBR });
                end = endOfWeek(now, { locale: ptBR });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'year':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'last30':
                start = startOfDay(subDays(now, 30));
                end = endOfDay(now);
                break;
            case 'custom':
                if (this.startDate && this.endDate) {
                    start = startOfDay(parseISO(this.startDate));
                    end = endOfDay(parseISO(this.endDate));
                }
                break;
        }
        return { start, end };
    }

    onFilterChange() {
        this.currentPage = 1;
        this.loadLogs();
    }

    onSearch() {
        this.currentPage = 1;
        this.loadLogs();
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadLogs();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadLogs();
        }
    }

    goToPage(page: number) {
        this.currentPage = page;
        this.loadLogs();
    }

    getPagesArray() {
        return Array.from({ length: Math.min(5, this.totalPages) }, (_, i) => {
            if (this.totalPages <= 5) return i + 1;
            if (this.currentPage <= 3) return i + 1;
            if (this.currentPage >= this.totalPages - 2) return this.totalPages - 4 + i;
            return this.currentPage - 2 + i;
        });
    }

    formatDate(dateStr: string) {
        return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm');
    }

    getValueFromLog(log: AuditLogItem): number | null {
        try {
            const data = JSON.parse(log.valorNovo || log.valorAntigo || '{}');
            return data.valor ? Number(data.valor) : null;
        } catch {
            return null;
        }
    }

    async showToast(msg: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }


}
