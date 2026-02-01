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
      // 1. Dados Cadastrais
      razaoSocial: ['', [Validators.required]],
      nomeFantasia: [''],
      cnpj: ['', [Validators.required]],


      email: ['', [Validators.email]],
      telefone: [''],
      endereco: [''],

      // 2. Representante Legal
      representanteNome: [''],
      representanteCpf: [''],
      representanteCargo: [''],
      representanteEmail: [''],
      representanteTelefone: [''],

      // 3. Responsável Financeiro
      financeiroNome: [''],
      financeiroEmail: [''],
      financeiroWhatsapp: [''],
      financeiroPreferenciaContato: [''],

      // 4. Dados Operacionais - REMOVED
      // 5. Dados Fiscais
      emissaoNf: [false],
      emailNf: [''],
      obsFiscais: [''],

      // 6. Dados Jurídicos - REMOVED
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
      this.clientForm.patchValue(client);
    });
  }

  async onSubmit() {
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;

      if (this.isEditMode && this.clientId) {
        this.clientsService.update(this.clientId, clientData).subscribe({
          next: () => this.showToast('Cliente atualizado com sucesso!'),
          error: () => this.showToast('Erro ao atualizar cliente.')
        });
      } else {
        this.clientsService.create(clientData).subscribe({
          next: () => {
            this.showToast('Cliente criado com sucesso!');
            this.router.navigate(['/clients']);
          },
          error: () => this.showToast('Erro ao criar cliente.')
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
                error: () => this.showToast('Erro ao excluir cliente.')
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
}
