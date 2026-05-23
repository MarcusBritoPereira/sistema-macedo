import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol, 
  IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption, 
  IonToggle, IonSegment, IonSegmentButton, ToastController, LoadingController 
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { CostCentersService, CostCenter } from '../../../services/financial/cost-centers.service';
import { ObrasService } from '../../../services/financial/obras.service';
import { CategoriesService } from '../../../services/financial/categories.service';
import { UsersService } from '../../../services/users/users';
import { addIcons } from 'ionicons';
import { saveOutline, trashOutline, arrowBackOutline, refreshOutline, sparklesOutline } from 'ionicons/icons';

@Component({
    selector: 'app-cost-center-detail',
    templateUrl: './cost-center-detail.page.html',
    styleUrls: ['./cost-center-detail.page.scss'],
    standalone: true,
    imports: [
      CommonModule, 
      FormsModule, 
      IonContent, 
      IonHeader, 
      IonTitle, 
      IonToolbar, 
      IonButtons, 
      IonBackButton, 
      IonButton, 
      IonIcon, 
      IonCard, 
      IonCardContent, 
      IonGrid, 
      IonRow, 
      IonCol, 
      IonItem, 
      IonLabel, 
      IonInput, 
      IonTextarea,
      IonSelect,
      IonSelectOption,
      IonToggle,
      IonSegment,
      IonSegmentButton
    ]
})
export class CostCenterDetailPage implements OnInit {
    costCenter: CostCenter = {
        nome: '',
        codigo: '',
        descricao: '',
        tipo: '',
        categoriaFinanceira: '',
        parentId: '',
        obraId: '',
        etapaId: '',
        ativo: true,
        aceitaLancamento: true,
        orcamentoPrevisto: undefined,
        limiteMaximo: undefined,
        aprovacaoNecessaria: false,
        responsavelId: '',
        planoContaId: '',
        categoriaCompra: '',
        contaContabil: '',
        unidadeMedida: '',
        metaFisica: undefined,
        tags: '',
        cor: '#475569' // Default Slate hex
    };
    isNew = true;
    selectedTab = 'basico';

    parentOptions: CostCenter[] = [];
    allCostCenters: CostCenter[] = [];
    obraOptions: any[] = [];
    planoContaOptions: any[] = [];
    responsavelOptions: any[] = [];

    // Dropdowns hardcoded options
    tipoOptions = [
      { label: 'Operacional', value: 'OPERACIONAL' },
      { label: 'Administrativo', value: 'ADMINISTRATIVO' },
      { label: 'Comercial', value: 'COMERCIAL' },
      { label: 'Financeiro', value: 'FINANCEIRO' },
      { label: 'Engenharia', value: 'ENGENHARIA' },
      { label: 'Suprimentos', value: 'SUPRIMENTOS' },
      { label: 'RH', value: 'RH' },
      { label: 'Pós-obra', value: 'POS_OBRA' },
      { label: 'Equipamentos', value: 'EQUIPAMENTOS' }
    ];

    categoriaFinanceiraOptions = [
      { label: 'Receita', value: 'RECEITA' },
      { label: 'Custo', value: 'CUSTO' },
      { label: 'Despesa', value: 'DESPESA' },
      { label: 'Investimento', value: 'INVESTIMENTO' }
    ];

    etapaOptions = [
      { label: 'Fundação', value: 'FUNDACAO' },
      { label: 'Estrutura', value: 'ESTRUTURA' },
      { label: 'Acabamento', value: 'ACABAMENTO' },
      { label: 'Instalações', value: 'INSTALACOES' },
      { label: 'Fachada', value: 'FACHADA' }
    ];

    categoriaCompraOptions = [
      { label: 'Material', value: 'Material' },
      { label: 'Serviço', value: 'Servico' },
      { label: 'Equipamento', value: 'Equipamento' }
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private costCenterService: CostCentersService,
        private obrasService: ObrasService,
        private categoriesService: CategoriesService,
        private usersService: UsersService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController
    ) {
        addIcons({ saveOutline, trashOutline, arrowBackOutline, refreshOutline, sparklesOutline });
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        const isNewId = !id || id === 'new';
        
        this.loadRelations(isNewId ? null : id);
        
        if (!isNewId) {
            this.isNew = false;
            this.loadCostCenter(id);
        }
    }

    loadRelations(currentId: string | null) {
        // Load parent cost centers
        this.costCenterService.findAll().subscribe(ccs => {
            this.allCostCenters = ccs;
            this.parentOptions = currentId ? ccs.filter(c => c.id !== currentId) : ccs;
        });

        // Load obras
        this.obrasService.getAll().subscribe({
            next: (obras) => this.obraOptions = obras,
            error: (err) => console.error('Error loading Obras', err)
        });

        // Load plano de contas (financial categories)
        this.categoriesService.findAll().subscribe({
            next: (cats) => this.planoContaOptions = cats,
            error: (err) => console.error('Error loading Categories', err)
        });

        // Load users (responsible individuals)
        this.usersService.findAll().subscribe({
            next: (users) => this.responsavelOptions = users,
            error: (err) => console.error('Error loading Users', err)
        });
    }

    loadCostCenter(id: string) {
        this.costCenterService.findAll().subscribe(ccs => {
            const found = ccs.find(c => c.id === id);
            if (found) {
                this.costCenter = {
                    ...found,
                    // Parse values to correct models
                    orcamentoPrevisto: found.orcamentoPrevisto ? Number(found.orcamentoPrevisto) : undefined,
                    limiteMaximo: found.limiteMaximo ? Number(found.limiteMaximo) : undefined,
                    metaFisica: found.metaFisica ? Number(found.metaFisica) : undefined,
                };
            }
        });
    }

    onParentChange() {
        this.generateSuggestedCode();
    }

    generateSuggestedCode() {
        if (!this.costCenter.parentId) {
            // Macro Level Code
            const macros = this.allCostCenters.filter(c => !c.parentId);
            const nextNum = macros.length + 1;
            this.costCenter.codigo = `${nextNum}`;
            return;
        }

        const parent = this.allCostCenters.find(c => c.id === this.costCenter.parentId);
        if (!parent) return;

        const siblings = this.allCostCenters.filter(c => c.parentId === parent.id);
        const parentCode = parent.codigo || '1';
        
        const nextIndex = siblings.length + 1;
        const suffix = nextIndex < 10 ? `0${nextIndex}` : `${nextIndex}`;
        this.costCenter.codigo = `${parentCode}.${suffix}`;
    }

    async save() {
        const loading = await this.loadingCtrl.create({ message: 'Salvando...' });
        await loading.present();

        // Convert number properties or leave as null for blank
        const payload = {
            ...this.costCenter,
            orcamentoPrevisto: this.costCenter.orcamentoPrevisto ? Number(this.costCenter.orcamentoPrevisto) : null,
            limiteMaximo: this.costCenter.limiteMaximo ? Number(this.costCenter.limiteMaximo) : null,
            metaFisica: this.costCenter.metaFisica ? Number(this.costCenter.metaFisica) : null
        };

        if (this.isNew) {
            this.costCenterService.create(payload).subscribe({
                next: async () => {
                    await loading.dismiss();
                    this.router.navigate(['/financial/cost-centers']);
                    this.showToast('Centro de custo criado com sucesso!');
                },
                error: async (err) => {
                    await loading.dismiss();
                    console.error(err);
                    this.showToast('Erro ao criar centro de custo.', 'danger');
                }
            });
        } else {
            if (this.costCenter.id) {
                this.costCenterService.update(this.costCenter.id, payload).subscribe({
                    next: async () => {
                        await loading.dismiss();
                        this.router.navigate(['/financial/cost-centers']);
                        this.showToast('Centro de custo atualizado com sucesso!');
                    },
                    error: async (err) => {
                        await loading.dismiss();
                        console.error(err);
                        this.showToast('Erro ao atualizar.', 'danger');
                    }
                });
            }
        }
    }

    async showToast(msg: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }

    delete() {
        if (this.costCenter.id) {
            this.costCenterService.delete(this.costCenter.id).subscribe(() => {
                this.router.navigate(['/financial/cost-centers']);
                this.showToast('Centro de custo removido.');
            });
        }
    }
}

