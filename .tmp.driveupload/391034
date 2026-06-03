
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContractsService } from '../../services/contracts/contracts';
import { ClientsService, Cliente } from '../../services/clients/clients';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonDatetime, IonDatetimeButton, IonModal, IonSelect, IonSelectOption, AlertController, IonCard, IonGrid, IonRow, IonCol, IonIcon, IonText, IonNote, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-contract-detail',
  templateUrl: './contract-detail.page.html',
  styleUrls: ['./contract-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonDatetime, IonDatetimeButton, IonModal, IonSelect, IonSelectOption, IonCard, IonGrid, IonRow, IonCol, IonIcon, IonText, IonNote, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent]

})
export class ContractDetailPage implements OnInit {
  contractForm: FormGroup;
  isEditMode = false;
  contractId: string | null = null;
  clients: Cliente[] = [];
  toastMessage = '';
  isToastOpen = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private contractsService: ContractsService,
    private clientsService: ClientsService,
    private alertController: AlertController
  ) {
    this.contractForm = this.fb.group({
      descricao: ['', [Validators.required]],
      valorMensal: ['', [Validators.required]],
      tipo: ['RECORRENTE', [Validators.required]],
      diaVencimento: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
      dataInicio: [new Date().toISOString(), [Validators.required]],
      dataFim: [null],
      clienteId: ['', [Validators.required]],
      ativo: [true]
    });
  }

  ngOnInit() {
    this.loadClients();
    this.contractId = this.route.snapshot.paramMap.get('id');
    if (this.contractId && this.contractId !== 'new') {
      this.isEditMode = true;
      this.loadContract(this.contractId);
    }
  }

  loadClients() {
    this.clientsService.findAll().subscribe(data => {
      this.clients = data;
    });
  }

  loadContract(id: string) {
    this.contractsService.findOne(id).subscribe(contract => {
      this.contractForm.patchValue(contract);
    });
  }

  async onSubmit() {
    if (this.contractForm.valid) {
      const data = this.contractForm.value;
      // Ensure valorMensal is number
      data.valorMensal = parseFloat(data.valorMensal);
      if (this.isEditMode && this.contractId) {
        this.contractsService.update(this.contractId, data).subscribe({
          next: () => this.showToast('Contrato atualizado com sucesso!'),
          error: (err) => {
            console.error('Update error:', err);
            this.showToast(this.getErrorMessage(err, 'Não foi possível atualizar o contrato.'));
          }
        });
      } else {
        this.contractsService.create(data).subscribe({
          next: () => {
            this.showToast('Contrato criado com sucesso!');
            this.router.navigate(['/contracts']);
          },
          error: (err) => {
            console.error('Create error:', err);
            this.showToast(this.getErrorMessage(err, 'Não foi possível criar o contrato.'));
          }
        });
      }
    } else {
      this.contractForm.markAllAsTouched();
      this.showToast('Preencha os campos obrigatórios antes de salvar.');
    }
  }

  async onDelete() {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este contrato?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            if (this.contractId) {
              this.contractsService.delete(this.contractId).subscribe({
                next: () => {
                  this.showToast('Contrato excluído com sucesso!');
                  this.router.navigate(['/contracts']);
                },
                error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível excluir o contrato.'))
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

  get days(): number[] {
    return Array.from({ length: 31 }, (_, i) => i + 1);
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

  async generateFinancial() {
    if (!this.contractId) return;

    const alert = await this.alertController.create({
      header: 'Gerar Financeiro',
      message: 'Deseja gerar os lançamentos financeiros para este contrato? Isso criará contas a receber para todo o período do contrato (ou próximos 12 meses).',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Gerar',
          handler: () => {
            if (this.contractId) {
              this.contractsService.generateFinancial(this.contractId).subscribe({
                next: (res) => {
                  this.showToast(`Sucesso! ${res.count} lançamentos gerados.`);
                },
                error: (err) => {
                  console.error(err);
                  this.showToast(this.getErrorMessage(err, 'Não foi possível gerar os lançamentos financeiros.'));
                }
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
