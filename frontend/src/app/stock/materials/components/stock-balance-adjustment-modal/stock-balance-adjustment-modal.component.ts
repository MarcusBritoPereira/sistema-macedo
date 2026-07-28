import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  IonFooter,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, cashOutline, saveOutline } from 'ionicons/icons';
import { StockLocation, StockMaterial } from '../../../../services/stock/stock.service';

@Component({
  selector: 'app-stock-balance-adjustment-modal',
  templateUrl: './stock-balance-adjustment-modal.component.html',
  styleUrls: ['./stock-balance-adjustment-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonFooter,
  ],
})
export class StockBalanceAdjustmentModalComponent implements OnInit {
  @Input() material!: StockMaterial;
  @Input() locations: StockLocation[] = [];

  form: FormGroup;
  operationType: 'entrada' | 'saida' = 'entrada';

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder
  ) {
    addIcons({ closeOutline, cashOutline, saveOutline });
    this.form = this.fb.group({
      localEstoqueId: ['', Validators.required],
      quantidade: ['', [Validators.required, Validators.min(0.01)]],
      custoUnitario: [''],
    });
  }

  ngOnInit() {
    if (this.locations.length > 0) {
      this.form.patchValue({ localEstoqueId: this.locations[0].id });
    }
  }

  onOperationChange(event: any) {
    this.operationType = event.detail.value;
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const data = this.form.value;
    let finalQty = Number(data.quantidade);
    if (this.operationType === 'saida') {
      finalQty = -Math.abs(finalQty);
    } else {
      finalQty = Math.abs(finalQty);
    }

    this.modalCtrl.dismiss({
      localEstoqueId: data.localEstoqueId,
      quantidade: finalQty,
      custoUnitario: data.custoUnitario ? Number(data.custoUnitario) : undefined,
    }, 'confirm');
  }
}
