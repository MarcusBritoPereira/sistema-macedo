
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonSearchbar, IonList, IonItem, IonLabel, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, addCircleOutline, checkmarkOutline } from 'ionicons/icons';

export interface SelectionItem {
    id: string;
    label: string;
    subLabel?: string;
    detail?: any;
}

@Component({
    selector: 'app-searchable-selection-modal',
    templateUrl: './searchable-selection-modal.component.html',
    styleUrls: ['./searchable-selection-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
        IonIcon, IonSearchbar, IonList, IonItem, IonLabel
    ]
})
export class SearchableSelectionModalComponent implements OnInit {
    @Input() title: string = 'Selecione';
    @Input() items: SelectionItem[] = [];
    @Input() selectedId: string | null = null;
    @Input() enableCreate: boolean = false;
    @Input() createLabel: string = 'Adicionar Novo';

    searchTerm: string = '';
    filteredItems: SelectionItem[] = [];

    constructor(private modalCtrl: ModalController) {
        addIcons({ closeOutline, addCircleOutline, checkmarkOutline });
    }

    @ViewChild(IonSearchbar) searchbar!: IonSearchbar;

    ngOnInit() {
        this.filteredItems = [...this.items];
    }

    ionViewDidEnter() {
        setTimeout(() => {
            this.searchbar?.setFocus();
        }, 300);
    }

    filterItems(event: any) {
        const query = event.target.value?.toLowerCase() || '';
        this.searchTerm = query;

        if (!query) {
            this.filteredItems = [...this.items];
            return;
        }

        this.filteredItems = this.items.filter(item =>
            item.label.toLowerCase().includes(query) ||
            (item.subLabel && item.subLabel.toLowerCase().includes(query))
        );
    }

    select(item: SelectionItem) {
        this.modalCtrl.dismiss(item);
    }

    createNew() {
        this.modalCtrl.dismiss({ id: '_NEW_' });
    }

    cancel() {
        this.modalCtrl.dismiss();
    }
}
