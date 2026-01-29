
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
      valorMensal: ['', [Validators.required]], // Changed from valor
      dataInicio: [new Date().toISOString(), [Validators.required]],
      dataFim: [null], // Optional to match schema
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
    console.log('onSubmit called. Valid:', this.contractForm.valid);
    console.log('Form errors:', this.contractForm.errors);
    Object.keys(this.contractForm.controls).forEach(key => {
      const controlErrors = this.contractForm.get(key)?.errors;
      if (controlErrors) {
        console.log('Control error:', key, controlErrors);
      }
    });

    if (this.contractForm.valid) {
      const data = this.contractForm.value;
      // Ensure valorMensal is number
      data.valorMensal = parseFloat(data.valorMensal);
      console.log('Submitting data:', data);

      if (this.isEditMode && this.contractId) {
        this.contractsService.update(this.contractId, data).subscribe({
          next: () => this.showToast('Contrato atualizado com sucesso!'),
          error: (err) => {
            console.error('Update error:', err);
            this.showToast('Erro ao atualizar contrato.');
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
            this.showToast('Erro ao criar contrato.');
          }
        });
      }
    } else {
      this.showToast('Por favor, preencha todos os campos obrigatórios.');
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
                error: () => this.showToast('Erro ao excluir contrato.')
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
