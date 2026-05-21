import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ObrasService, Obra } from '../../../services/financial/obras.service';
import { ToastService } from '../../../services/toast.service';
import { ClientsService } from '../../../services/clients.service';
import { CostCentersService } from '../../../services/financial/cost-centers.service';

@Component({
  selector: 'app-obra-detail',
  templateUrl: './obra-detail.page.html',
  styleUrls: ['./obra-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class ObraDetailPage implements OnInit {
  form: FormGroup;
  isEdit = false;
  obraId: string | null = null;
  loading = false;
  saving = false;

  clientes: any[] = [];
  centrosCusto: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private obrasService: ObrasService,
    private toastService: ToastService,
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
    }
  }

  loadDependencies() {
    this.clientsService.getAll().subscribe(res => this.clientes = res);
    this.costCentersService.getAll().subscribe(res => this.centrosCusto = res);
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
      error: (err) => {
        console.error(err);
        this.toastService.showError('Erro ao carregar os dados da obra.');
        this.loading = false;
        this.goBack();
      }
    });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.showWarning('Preencha os campos obrigatórios.');
      return;
    }

    this.saving = true;
    const data = this.form.value;

    try {
      if (this.isEdit && this.obraId) {
        await this.obrasService.update(this.obraId, data).toPromise();
        this.toastService.showSuccess('Obra atualizada com sucesso!');
      } else {
        await this.obrasService.create(data).toPromise();
        this.toastService.showSuccess('Obra criada com sucesso!');
      }
      this.goBack();
    } catch (err) {
      console.error(err);
      this.toastService.showError('Erro ao salvar a obra.');
    } finally {
      this.saving = false;
    }
  }

  async deleteObra() {
    if (!this.obraId) return;
    
    // Simplification for the autonomous agent. A real confirm dialog could be added here.
    if(confirm('Tem certeza que deseja excluir esta obra?')) {
      this.saving = true;
      try {
        await this.obrasService.delete(this.obraId).toPromise();
        this.toastService.showSuccess('Obra excluída com sucesso!');
        this.goBack();
      } catch (err) {
        console.error(err);
        this.toastService.showError('Erro ao excluir a obra.');
      } finally {
        this.saving = false;
      }
    }
  }

  goBack() {
    this.location.back();
  }
}
