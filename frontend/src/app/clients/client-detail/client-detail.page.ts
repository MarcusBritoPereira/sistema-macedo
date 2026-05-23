import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientsService } from '../../services/clients/clients';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonItem, IonLabel, IonInput, IonToast, IonCard, IonGrid, IonRow, IonCol, AlertController, IonAccordion, IonAccordionGroup, IonTextarea, IonSelect, IonSelectOption, IonToggle, IonCheckbox } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, personOutline, cashOutline, constructOutline, receiptOutline, scaleOutline, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-client-detail',
  templateUrl: './client-detail.page.html',
  styleUrls: ['./client-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonItem, IonLabel, IonInput, IonToast, IonCard, IonGrid, IonRow, IonCol, IonAccordion, IonAccordionGroup, IonTextarea, IonSelect, IonSelectOption, IonToggle, IonCheckbox]
})
export class ClientDetailPage implements OnInit {
  clientForm: FormGroup;
  isEditMode = false;
  clientId: string | null = null;
  toastMessage = '';
  isToastOpen = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clientsService: ClientsService,
    private alertController: AlertController
  ) {
    addIcons({ businessOutline, personOutline, cashOutline, constructOutline, receiptOutline, scaleOutline, trashOutline });

    this.clientForm = this.fb.group({
      razaoSocial: ['', [Validators.required]],
      cpf: [''],
      email: ['', [Validators.email]],
      telefone: [''],
      endereco: ['']
    });
  }

  ngOnInit() {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId && this.clientId !== 'new') {
      this.isEditMode = true;
      this.loadClient(this.clientId);
    }
  }

  loadClient(id: string) {
    this.clientsService.findOne(id).subscribe(client => {
      const data: any = { ...client };
      if (data.cnpj) data.cnpj = this.formatCnpj(data.cnpj);
      if (data.cpf) data.cpf = this.formatCpf(data.cpf);
      this.clientForm.patchValue(data);
    });
  }

  formatCnpj(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return value;
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  formatCpf(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) return value;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  async onSubmit() {
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;

      if (this.isEditMode && this.clientId) {
        this.clientsService.update(this.clientId, clientData).subscribe({
          next: () => this.showToast('Cliente atualizado com sucesso!'),
          error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível atualizar o cliente.'))
        });
      } else {
        this.clientsService.create(clientData).subscribe({
          next: () => {
            this.showToast('Cliente criado com sucesso!');
            this.router.navigate(['/clients']);
          },
          error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível criar o cliente.'))
        });
      }
    }
  }

  async onDelete() {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este cliente?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            if (this.clientId) {
              this.clientsService.delete(this.clientId).subscribe({
                next: () => {
                  this.showToast('Cliente excluído com sucesso!');
                  this.router.navigate(['/clients']);
                },
                error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível excluir o cliente.'))
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.isToastOpen = true;
  }

  setToastOpen(isOpen: boolean) {
    this.isToastOpen = isOpen;
  }
  private getErrorMessage(err: any, fallback: string): string {
    const message = err?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' | ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }
}

