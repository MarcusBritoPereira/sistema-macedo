
import { Component, Input } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, trash, close } from 'ionicons/icons';

@Component({
    selector: 'app-actions-popover',
    template: `
    <ion-list lines="none" class="ion-no-margin ion-no-padding">
      <ion-item button detail="false" *ngFor="let result of actions" (click)="selectAction(result)" [class.destructive]="result.role === 'destructive'">
        <ion-icon [name]="result.icon" slot="start" size="small"></ion-icon>
        <ion-label>{{ result.text }}</ion-label>
      </ion-item>
    </ion-list>
  `,
    styles: [`
    ion-item {
      --min-height: 44px;
      font-size: 14px;
      color: #374151; /* Gray 700 */
      cursor: pointer;
    }
    ion-item:hover {
      --background: #f3f4f6; /* Gray 100 */
    }
    ion-item.destructive {
      color: #ef4444; /* Red 500 */
    }
    ion-item.destructive ion-icon {
      color: #ef4444;
    }
    ion-icon {
      color: #6b7280; /* Gray 500 */
      margin-right: 8px;
    }
  `],
    standalone: true,
    imports: [IonicModule, CommonModule]
})
export class ActionsPopoverComponent {
    @Input() actions: any[] = [];

    constructor(private popoverCtrl: PopoverController) {
        addIcons({ checkmarkCircleOutline, trash, close });
    }

    selectAction(action: any) {
        this.popoverCtrl.dismiss({
            action: action
        });
    }
}
