
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonAccordionGroup, IonAccordion, IonFooter, IonButton } from '@ionic/angular/standalone';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, homeSharp, peopleOutline, peopleSharp, cashOutline, cashSharp, logOutOutline, logOutSharp, documentTextOutline, documentTextSharp, pricetagOutline, pricetagSharp, walletOutline, walletSharp, listOutline, listSharp, barChartOutline, barChartSharp, settingsOutline, settingsSharp, arrowDownCircleOutline, arrowDownCircleSharp, arrowUpCircleOutline, arrowUpCircleSharp, statsChartOutline, statsChartSharp, calendarOutline, calendarSharp, trendingUpOutline, trendingUpSharp, lockClosedOutline, lockClosedSharp, receiptOutline, receiptSharp, libraryOutline, librarySharp, listCircleOutline, listCircleSharp, timeOutline, timeSharp, gitCompareOutline, gitCompareSharp, globeOutline, globeSharp, businessOutline, businessSharp, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { AuthService } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, RouterLink, RouterLinkActive, IonAccordionGroup, IonAccordion, IonFooter, IonButton],
})
export class AppComponent {
  isMenuCollapsed = false;

  constructor(public auth: AuthService) {
    addIcons({
      homeOutline, homeSharp, peopleOutline, peopleSharp, cashOutline, cashSharp,
      logOutOutline, logOutSharp, documentTextOutline, documentTextSharp,
      pricetagOutline, pricetagSharp, walletOutline, walletSharp, listOutline,
      listSharp, barChartOutline, barChartSharp, settingsOutline, settingsSharp,
      arrowDownCircleOutline, arrowDownCircleSharp, arrowUpCircleOutline,
      arrowUpCircleSharp, statsChartOutline, statsChartSharp, calendarOutline,
      calendarSharp, trendingUpOutline, trendingUpSharp, lockClosedOutline,
      lockClosedSharp, receiptOutline, receiptSharp, libraryOutline, librarySharp,
      listCircleOutline, listCircleSharp, timeOutline, timeSharp, gitCompareOutline,
      gitCompareSharp, globeOutline, globeSharp, businessOutline, businessSharp,
      chevronBackOutline, chevronForwardOutline
    });
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
  }

  logout() {
    this.auth.logout();
  }
}
