import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { ObrasService, Obra, ParcelaObra } from '../../../services/financial/obras.service';
import { ClientsService } from '../../../services/clients/clients';
import { CostCentersService } from '../../../services/financial/cost-centers.service';

@Component({
  selector: 'app-obra-detail',
  templateUrl: './obra-detail.page.html',
  styleUrls: ['./obra-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class ObraDetailPage implements OnInit {
  form: FormGroup;
  isEdit = false;
  obraId: string | null = null;
  loading = false;
  saving = false;

  currentTab: 'detalhes' | 'parcelas' = 'detalhes';
  parcelas: ParcelaObra[] = [];

  clientes: any[] = [];
  centrosCusto: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private obrasService: ObrasService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private clientsService: ClientsService,
    private costCentersService: CostCentersService,
    private location: Location
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      dataInicio: [''],
      dataPrevisaoFim: [''],
      dataConclusao: [''],
      status: ['PLANEJAMENTO', Validators.required],
      orcamentoPrevisto: [0],
      endereco: [''],
      clienteId: [null],
      centroCustoId: [null],
      ativo: [true]
    });
  }

  ngOnInit() {
    this.obraId = this.route.snapshot.paramMap.get('id');
    this.isEdit = this.obraId !== 'new' && !!this.obraId;

    this.loadDependencies();

    if (this.isEdit) {
      this.loadObra();
      this.loadParcelas();
    }
  }

  loadDependencies() {
    this.clientsService.findAll().subscribe(res => this.clientes = res);
    this.costCentersService.findAll().subscribe(res => this.centrosCusto = res);
  }

  loadObra() {
    if (!this.obraId) return;
    this.loading = true;
    this.obrasService.getById(this.obraId).subscribe({
      next: (obra) => {
        this.form.patchValue({
          nome: obra.nome,
          descricao: obra.descricao,
          dataInicio: obra.dataInicio ? obra.dataInicio.split('T')[0] : null,
          dataPrevisaoFim: obra.dataPrevisaoFim ? obra.dataPrevisaoFim.split('T')[0] : null,
          dataConclusao: obra.dataConclusao ? obra.dataConclusao.split('T')[0] : null,
          status: obra.status,
          orcamentoPrevisto: obra.orcamentoPrevisto,
          endereco: obra.endereco,
          clienteId: obra.clienteId,
          centroCustoId: obra.centroCustoId,
          ativo: obra.ativo
        });
        this.loading = false;
      },
      error: async (err) => {
        console.error(err);
        await this.showToast('Erro ao carregar os dados da obra.', 'danger');
        this.loading = false;
        this.goBack();
      }
    });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.showToast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    this.saving = true;
    
    // Sanitize data before sending to backend to avoid validation errors
    const rawData = this.form.value;
    const data = { ...rawData };
    
    const sanitize = (val: any) => val === '' || val === 'null' || val === null || val === undefined ? null : val;
    
    data.dataInicio = sanitize(data.dataInicio);
    data.dataPrevisaoFim = sanitize(data.dataPrevisaoFim);
    data.dataConclusao = sanitize(data.dataConclusao);
    data.clienteId = sanitize(data.clienteId);
    data.centroCustoId = sanitize(data.centroCustoId);
    data.endereco = sanitize(data.endereco);
    data.descricao = sanitize(data.descricao);
    
    if (data.orcamentoPrevisto) {
      data.orcamentoPrevisto = Number(data.orcamentoPrevisto);
    } else {
      data.orcamentoPrevisto = null;
    }

    try {
      if (this.isEdit && this.obraId) {
        await this.obrasService.update(this.obraId, data).toPromise();
        await this.showToast('Obra atualizada com sucesso!', 'success');
      } else {
        await this.obrasService.create(data).toPromise();
        await this.showToast('Obra criada com sucesso!', 'success');
      }
      this.goBack();
    } catch (err) {
      console.error(err);
      await this.showToast('Erro ao salvar a obra.', 'danger');
    } finally {
      this.saving = false;
    }
  }

  async deleteObra() {
    if (!this.obraId) return;
    
    if(confirm('Tem certeza que deseja excluir esta obra?')) {
      this.saving = true;
      try {
        await this.obrasService.delete(this.obraId).toPromise();
        await this.showToast('Obra excluída com sucesso!', 'success');
        this.goBack();
      } catch (err) {
        console.error(err);
        await this.showToast('Erro ao excluir a obra.', 'danger');
      } finally {
        this.saving = false;
      }
    }
  }

  goBack() {
    this.location.back();
  }

  // Parcelas Methods
  loadParcelas() {
    if (!this.obraId) return;
    this.obrasService.getParcelas(this.obraId).subscribe({
      next: (data) => this.parcelas = data,
      error: () => this.showToast('Erro ao carregar parcelas', 'danger')
    });
  }

  async openParcelaModal(parcela?: ParcelaObra) {
    const alert = await this.alertCtrl.create({
      header: parcela ? 'Editar Parcela' : 'Nova Parcela',
      inputs: [
        {
          name: 'percentual',
          type: 'number',
          placeholder: 'Percentual (%)',
          value: parcela?.percentual || ''
        },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Valor (R$)',
          value: parcela?.valor || ''
        },
        {
          name: 'dataVencimento',
          type: 'date',
          value: parcela?.dataVencimento ? parcela.dataVencimento.split('T')[0] : ''
        },
        // We'll have a default status or read it if editing.
        // Alert inputs don't support selects well natively without custom UI, 
        // so we'll just handle status as PREVISTO for new, and maybe keep existing.
        // Let's add a text input or just default it. We can add a radio group, but inputs type=radio replaces the whole form.
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salvar',
          handler: (data) => {
            if (!data.valor || !data.dataVencimento) {
              this.showToast('Valor e Vencimento são obrigatórios.', 'warning');
              return false; // keep open
            }
            this.saveParcela(data, parcela);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  saveParcela(data: any, existing?: ParcelaObra) {
    if (!this.obraId) return;

    const payload: Partial<ParcelaObra> = {
      obraId: this.obraId,
      percentual: data.percentual ? Number(data.percentual) : undefined,
      valor: Number(data.valor),
      dataVencimento: new Date(data.dataVencimento).toISOString(),
      status: existing ? existing.status : 'PREVISTO'
    };

    if (existing && existing.id) {
      this.obrasService.updateParcela(this.obraId, existing.id, payload).subscribe({
        next: () => {
          this.showToast('Parcela atualizada!', 'success');
          this.loadParcelas();
        },
        error: () => this.showToast('Erro ao atualizar parcela', 'danger')
      });
    } else {
      this.obrasService.createParcela(this.obraId, payload).subscribe({
        next: () => {
          this.showToast('Parcela criada!', 'success');
          this.loadParcelas();
        },
        error: () => this.showToast('Erro ao criar parcela', 'danger')
      });
    }
  }

  async deleteParcela(parcelaId: string) {
    if (!this.obraId) return;
    
    if(confirm('Tem certeza que deseja excluir esta parcela?')) {
      this.obrasService.deleteParcela(this.obraId, parcelaId).subscribe({
        next: () => {
          this.showToast('Parcela excluída', 'success');
          this.loadParcelas();
        },
        error: () => this.showToast('Erro ao excluir parcela', 'danger')
      });
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
