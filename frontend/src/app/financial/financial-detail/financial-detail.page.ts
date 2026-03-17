import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { CategoriesService, Category, Subcategory } from '../../services/financial/categories.service';
import { ClientsService, Cliente } from '../../services/clients/clients';
import { CostCentersService, CostCenter } from '../../services/financial/cost-centers.service';
import { SuppliersService, Supplier } from '../../services/suppliers/suppliers.service';
import { RecurringService } from '../../services/financial/recurring.service';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonDatetime, IonDatetimeButton, IonModal, AlertController, IonCard, IonGrid, IonRow, IonCol, IonIcon, IonSelect, IonSelectOption, IonTextarea, IonToggle, IonSegment, IonSegmentButton, IonNote, IonList, ModalController } from '@ionic/angular/standalone';
import { RateioModalComponent } from '../../shared/components/rateio-modal/rateio-modal.component';
import { addIcons } from 'ionicons';
import { trashOutline, attachOutline, cloudUploadOutline, documentTextOutline, chatboxEllipsesOutline, calendarOutline, checkmarkCircleOutline, listOutline, peopleOutline, walletOutline, pricetagOutline } from 'ionicons/icons';

@Component({
  selector: 'app-financial-detail',
  templateUrl: './financial-detail.page.html',
  styleUrls: ['./financial-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonDatetime, IonDatetimeButton, IonModal, IonCard, IonGrid, IonRow, IonCol, IonIcon, IonSelect, IonSelectOption, IonTextarea, IonToggle, IonSegment, IonSegmentButton, IonNote, IonList, RateioModalComponent]
})
export class FinancialDetailPage implements OnInit {
  financialForm: FormGroup;
  isEditMode = false;
  itemId: string | null = null;
  type: 'receivables' | 'payables' = 'receivables';
  toastMessage = '';
  isToastOpen = false;
  activeTab = 'observacoes';

  categories: Category[] = [];
  filteredSubcategories: Subcategory[] = [];
  clients: Cliente[] = [];
  costCenters: CostCenter[] = [];
  bankAccounts: BankAccount[] = [];
  suppliers: Supplier[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private financialService: FinancialService,
    private categoriesService: CategoriesService,
    private clientsService: ClientsService,
    private costCentersService: CostCentersService,
    private suppliersService: SuppliersService,
    private recurringService: RecurringService,
    private alertController: AlertController,
    private modalCtrl: ModalController
  ) {
    addIcons({ trashOutline, attachOutline, cloudUploadOutline, documentTextOutline, chatboxEllipsesOutline, calendarOutline, checkmarkCircleOutline, listOutline, peopleOutline, walletOutline, pricetagOutline });

    this.financialForm = this.fb.group({
      // Launch Info
      clienteId: [''], // Optional
      fornecedorId: [''], // NEW
      dataCompetencia: [new Date().toISOString(), [Validators.required]],
      descricao: ['', [Validators.required]],
      valor: ['', [Validators.required]],

      // Details
      habilitarRateio: [false],
      categoriaId: ['', [Validators.required]],
      subcategoriaId: [''],
      centroCustoId: [''],
      codigoReferencia: [''],

      // Payment Condition
      condicaoPagamento: ['A_VISTA', [Validators.required]],
      vencimento: [new Date().toISOString(), [Validators.required]],
      formaPagamento: ['PIX', [Validators.required]],
      contaBancariaId: ['', [Validators.required]],
      informarNsu: [false],
      nsu: [''],
      recebido: [false], // If true, status = REALIZADO

      // Recurrence
      habilitarRecurrencia: [false],
      frequencia: ['MENSAL'],
      tipoFimRecurrencia: ['UNDEFINED'], // 'UNDEFINED' | 'DATE'
      dataFimRecurrencia: [''],

      // Tabs
      observacoes: ['']
    });
  }

  ngOnInit() {
    // Determine type from URL segment
    const url = this.router.url;
    if (url.includes('payables')) {
      this.type = 'payables';
    } else {
      this.type = 'receivables';
    }

    this.itemId = this.route.snapshot.paramMap.get('id');

    // Load dependencies first
    Promise.all([
      this.loadCategories(),
      this.loadClients(),
      this.loadCostCenters(),
      this.loadBankAccounts(),
      this.loadSuppliers()
    ]).then(() => {
      if (this.itemId && this.itemId !== 'new') {
        this.isEditMode = true;
        this.loadItem(this.itemId);
      } else {
        // Check for query params (e.g. from quick add)
        this.route.queryParams.subscribe(params => {
          if (params['clientId']) {
            this.financialForm.patchValue({ clienteId: params['clientId'] });
          }
        });
      }
    });
  }

  loadCategories() {
    return new Promise<void>((resolve) => {
      this.categoriesService.findAll().subscribe({
        next: (cats) => {
          const typeFilter = this.type === 'receivables' ? 'RECEITA' : 'DESPESA';
          this.categories = cats.filter(c => c.tipo === typeFilter);
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  loadClients() {
    return new Promise<void>((resolve) => {
      this.clientsService.findAll().subscribe({
        next: (clients) => {
          this.clients = clients;
          resolve();
        },
        error: () => resolve()
      })
    })
  }

  loadSuppliers() {
    return new Promise<void>((resolve) => {
      this.suppliersService.findAll().subscribe({
        next: (items) => {
          this.suppliers = items.filter(i => i.ativo !== false); // Only active suppliers
          resolve();
        },
        error: () => resolve()
      })
    })
  }

  loadCostCenters() {
    return new Promise<void>((resolve) => {
      this.costCentersService.findAll().subscribe({
        next: (ccs) => {
          this.costCenters = ccs;
          resolve();
        },
        error: () => resolve()
      })
    })
  }

  loadBankAccounts() {
    return new Promise<void>((resolve) => {
      this.financialService.getBankAccounts().subscribe({
        next: (accs) => {
          this.bankAccounts = accs;
          resolve();
        },
        error: () => resolve()
      })
    })
  }

  onCategoryChange(event: any) {
    const categoryId = event.detail.value;
    const category = this.categories.find(c => c.id === categoryId);
    if (category && category.subcategorias) {
      this.filteredSubcategories = category.subcategorias;
    } else {
      this.filteredSubcategories = [];
    }
  }

  loadItem(id: string) {
    this.financialService.getTransaction(id).subscribe((item: any) => {
      // Setup subcategories before patching
      if (item.categoriaId) {
        // Check if the item.categoriaId is a subcategory or a parent category
        // Logic: Find if it matches a parent. If not, find parent that contains it as sub.
        let parentCat = this.categories.find(c => c.id === item.categoriaId);
        let subCatId = '';

        if (!parentCat) {
          // Maybe it's a subcategory ID
          for (const c of this.categories) {
            if (c.subcategorias?.find(s => s.id === item.categoriaId)) {
              parentCat = c;
              subCatId = item.categoriaId;
              break;
            }
          }
        }

        if (parentCat) {
          this.filteredSubcategories = parentCat.subcategorias || [];
          this.financialForm.patchValue({
            categoriaId: parentCat.id,
            subcategoriaId: subCatId
          });
        }
      }

      this.financialForm.patchValue({
        ...item,
        vencimento: item.dataVencimento,
        recebido: item.status === 'REALIZADO' || item.status === 'CONCILIADO',
        clienteId: item.clienteId,
        fornecedorId: item.fornecedorId,
        contaBancariaId: item.contaBancariaId // Ensure backend returns this
      });
    });
  }

  async onSubmit() {
    if (this.financialForm.valid) {
      const formValue = this.financialForm.value;

      const transactionData: any = {
        ...formValue,
        valor: parseFloat(formValue.valor),
        dataVencimento: formValue.vencimento,
        // If 'recebido' is true, set status to REALIZADO, else PREVISTO
        status: formValue.recebido ? 'REALIZADO' : 'PREVISTO',
        tipo: this.type === 'receivables' ? 'RECEITA' : 'DESPESA',
        // Send the subcategory ID if selected, otherwise parent category ID
        categoriaId: formValue.subcategoriaId || formValue.categoriaId
      };

      // Cleanup auxiliary fields if not part of DTO
      delete transactionData.subcategoriaId;
      delete transactionData.recebido;
      delete transactionData.vencimento; // we used dataVencimento

      const createRecurring = (transactionId: string) => {
        if (formValue.habilitarRecurrencia) {
          this.recurringService.create({
            sourceTransactionId: transactionId,
            frequencia: formValue.frequencia,
            dataInicio: formValue.vencimento, // Start from the first due date
            dataFim: formValue.tipoFimRecurrencia === 'DATE' ? formValue.dataFimRecurrencia : undefined
          }).subscribe({
            error: (e) => console.error('Error creating recurrence', e)
          });
        }
      };

      if (this.isEditMode && this.itemId) {
        this.financialService.updateTransaction(this.itemId, transactionData).subscribe({
          next: () => {
            // For simplicity V1: Editing transaction does NOT update recurrence settings yet.
            // User would need to go to Recurring List (Future V2)
            this.showToast('Registro atualizado com sucesso!');
            this.router.navigate(['/financial']);
          },
          error: () => this.showToast('Erro ao atualizar registro.')
        });
      } else {
        this.financialService.createTransaction(transactionData).subscribe({
          next: async (res: any) => {
            if (res && res.id) {
              createRecurring(res.id);
            }

            if (res?.suggestedStatements?.length > 0) {
              const count = res.suggestedStatements.length;
              const alert = await this.alertController.create({
                header: 'Conciliação Disponível',
                message: `Encontramos ${count} extrato(s) bancário(s) compatível(is) com este lançamento. Deseja ir para a conciliação agora?`,
                buttons: [
                  {
                    text: 'Depois',
                    role: 'cancel',
                    handler: () => {
                      this.showToast('Registro criado com sucesso!');
                      this.router.navigate(['/financial']);
                    }
                  },
                  {
                    text: 'Ir para Conciliação',
                    handler: () => {
                      this.showToast('Registro criado com sucesso!');
                      this.router.navigate(['/financial/reconciliation']);
                    }
                  }
                ]
              });
              await alert.present();
            } else {
              this.showToast('Registro criado com sucesso!');
              this.router.navigate(['/financial']);
            }
          },
          error: () => this.showToast('Erro ao criar registro.')
        });
      }
    } else {
      this.showToast('Por favor, preencha todos os campos obrigatórios.');
      this.financialForm.markAllAsTouched();
    }
  }

  async onDelete() {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este registro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            if (this.itemId) {
              this.financialService.deleteTransaction(this.itemId).subscribe({
                next: () => {
                  this.showToast('Registro excluído com sucesso!');
                  this.router.navigate(['/financial']);
                },
                error: () => this.showToast('Erro ao excluir registro.')
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

  async openRateioModal() {
    if (!this.itemId || this.itemId === 'new') {
      this.showToast('Salve o lançamento antes de definir o rateio detalhado.');
      return;
    }

    const modal = await this.modalCtrl.create({
      component: RateioModalComponent,
      componentProps: {
        transaction: {
          id: this.itemId,
          descricao: this.financialForm.get('descricao')?.value,
          valor: this.financialForm.get('valor')?.value,
          categoriaId: this.financialForm.get('subcategoriaId')?.value || this.financialForm.get('categoriaId')?.value,
          habilitarRateio: this.financialForm.get('habilitarRateio')?.value
        }
      }
    });

    await modal.present();
  }
}
