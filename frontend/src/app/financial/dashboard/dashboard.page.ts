import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList, IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton, IonDatetimeButton, IonModal, IonDatetime, IonSpinner } from '@ionic/angular/standalone';
import { FinancialDashboardService, DREResponse, OperationalDashboardResponse } from '../../services/financial/financial-dashboard.service';
import { addIcons } from 'ionicons';
import { filter, trendingUpOutline, trendingDownOutline, walletOutline, arrowUpCircleOutline, arrowDownCircleOutline, receiptOutline, timeOutline, statsChartOutline, syncOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList, IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton, IonDatetimeButton, IonModal, IonDatetime, IonSpinner]
})
export class DashboardPage implements OnInit {
  operationalData: OperationalDashboardResponse | null = null;
  loading = false;

  constructor(private dashboardService: FinancialDashboardService) {
    addIcons({ filter, trendingUpOutline, trendingDownOutline, walletOutline, arrowUpCircleOutline, arrowDownCircleOutline, receiptOutline, timeOutline, statsChartOutline, syncOutline, alertCircleOutline });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.dashboardService.getOperationalDashboard().subscribe({
      next: (data) => {
        this.operationalData = data;
        this.processChartData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading operational dashboard', err);
        this.loading = false;
      }
    });
  }

  maxChartValue = 100;

  processChartData() {
    if (!this.operationalData?.dailyFlow) return;
    let max = 0;
    this.operationalData.dailyFlow.forEach(d => {
      if (d.recebimentos > max) max = d.recebimentos;
      if (d.pagamentos > max) max = d.pagamentos;
    });
    this.maxChartValue = max > 0 ? max * 1.1 : 100; // 10% buffering
  }

  formatLastUpdate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Helpers
  getRotation(pct: number): string {
    // 0% = -90deg, 100% = 90deg (Half circle gauge) OR Full circle? 
    // User image shows Full Circle.
    // Let's assume full circle logic for CSS SVG.
    const deg = (pct / 100) * 360;
    return `${deg}deg`;
  }
}
