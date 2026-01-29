import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonItem, IonSelect, IonSelectOption, IonSpinner, IonGrid, IonRow, IonCol,
  IonIcon, IonBadge, IonButton
} from '@ionic/angular/standalone';
import { CashFlowService, CashFlowSummary } from '../../services/financial/cash-flow.service';
import { addIcons } from 'ionicons';
import {
  businessOutline, chevronBack, chevronForward, calendarOutline,
  refreshOutline, trendingUpOutline, trendingDownOutline, walletOutline,
  barChartOutline, informationCircleOutline
} from 'ionicons/icons';
import { parse, addMonths, format } from 'date-fns';

@Component({
  selector: 'app-cash-flow',
  templateUrl: './cash-flow.page.html',
  styleUrl: './cash-flow.page.scss',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonMenuButton, IonCard, IonCardContent, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonItem, IonSelect, IonSelectOption,
    IonSpinner, IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonButton
  ]
})
export class CashFlowPage implements OnInit {
  selectedMonthStr = format(new Date(), 'yyyy-MM');
  months: { value: string, label: string }[] = [];
  data: CashFlowSummary | null = null;
  dailyData: any[] = [];
  maxVal = 1000;
  loading = false;

  constructor(private cashFlowService: CashFlowService) {
    addIcons({
      businessOutline, chevronBack, chevronForward, calendarOutline,
      refreshOutline, trendingUpOutline, trendingDownOutline, walletOutline,
      barChartOutline, informationCircleOutline
    });
    this.generateMonths();
  }

  ngOnInit() {
    this.loadData();
  }

  generateMonths() {
    const monthsArr = [];
    const today = new Date();
    // Generate 6 months before and 6 months after today
    for (let i = -6; i <= 6; i++) {
      const d = addMonths(today, i);
      monthsArr.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy')
      });
    }
    this.months = monthsArr;
  }

  changeMonth(direction: number) {
    const currentDate = parse(this.selectedMonthStr, 'yyyy-MM', new Date());
    const nextDate = addMonths(currentDate, direction);
    this.selectedMonthStr = format(nextDate, 'yyyy-MM');
    this.loadData();
  }

  onMonthChange(event: any) {
    if (event.detail.value === this.selectedMonthStr) return;
    this.selectedMonthStr = event.detail.value;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    const [year, month] = this.selectedMonthStr.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    this.cashFlowService.getCashFlow(startDate, endDate).subscribe({
      next: (res) => {
        this.data = res;
        this.processDailyData(res.transactions, Number(year), Number(month), lastDay);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  processDailyData(transactions: any[], year: number, month: number, daysInMonth: number) {
    const days = [];
    let max = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const dayTrans = transactions.filter(t => t.dataVencimento && t.dataVencimento.startsWith(dateStr));

      const dayIn = dayTrans.filter(t => t.tipo === 'RECEITA').reduce((s, t) => s + Number(t.valor), 0);
      const dayOut = dayTrans.filter(t => t.tipo === 'DESPESA').reduce((s, t) => s + Number(t.valor), 0);

      if (dayIn > max) max = dayIn;
      if (dayOut > max) max = dayOut;

      days.push({
        date: new Date(year, month - 1, d),
        in: dayIn,
        out: dayOut
      });
    }

    this.dailyData = days;
    this.maxVal = max > 0 ? max : 1000;
  }
}
