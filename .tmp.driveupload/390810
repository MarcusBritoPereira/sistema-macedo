import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  searchOutline, businessOutline, chevronForwardOutline, chevronDownOutline, 
  add, cloudUploadOutline, downloadOutline, folderOutline, folderOpenOutline, 
  documentTextOutline, checkmarkCircleOutline, closeCircleOutline 
} from 'ionicons/icons';
import { CostCentersService, CostCenter } from '../../../services/financial/cost-centers.service';
import { RouterModule } from '@angular/router';
import { ImportModalComponent } from '../../../shared/components/import-modal/import-modal.component';

@Component({
  selector: 'app-cost-centers-list',
  templateUrl: './cost-centers-list.page.html',
  styleUrls: ['./cost-centers-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent]
})
export class CostCentersListPage implements OnInit {
  allCostCenters: CostCenter[] = [];
  displayRows: any[] = [];
  searchQuery = '';
  expandedNodes: { [id: string]: boolean } = {};

  constructor(
    private costCentersService: CostCentersService,
    private modalCtrl: ModalController
  ) {
    addIcons({ 
      searchOutline, businessOutline, chevronForwardOutline, chevronDownOutline, 
      add, cloudUploadOutline, downloadOutline, folderOutline, folderOpenOutline, 
      documentTextOutline, checkmarkCircleOutline, closeCircleOutline 
    });
  }

  ngOnInit() {
    this.loadCostCenters();
  }

  loadCostCenters(event?: any) {
    this.costCentersService.findAll().subscribe({
      next: (data) => {
        this.allCostCenters = data;
        this.processTree();
        if (event) event.target.complete();
      },
      error: (error) => {
        console.error('Error loading cost centers', error);
        if (event) event.target.complete();
      }
    });
  }

  processTree() {
    let filtered = [...this.allCostCenters];

    // 1. Search filter with parent inclusion
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      const directMatches = this.allCostCenters.filter(cc => 
        cc.nome.toLowerCase().includes(q) || 
        (cc.codigo && cc.codigo.toLowerCase().includes(q)) ||
        (cc.descricao && cc.descricao.toLowerCase().includes(q))
      );

      const includedIds = new Set(directMatches.map(f => f.id));
      const toCheck = [...directMatches];

      while (toCheck.length > 0) {
        const current = toCheck.pop()!;
        if (current.parentId && !includedIds.has(current.parentId)) {
          const parent = this.allCostCenters.find(cc => cc.id === current.parentId);
          if (parent) {
            includedIds.add(parent.id);
            directMatches.push(parent);
            toCheck.push(parent);
          }
        }
      }
      filtered = directMatches;
    }

    // 2. Build tree nodes map
    const map: { [id: string]: any } = {};
    const roots: any[] = [];

    filtered.forEach(item => {
      if (this.expandedNodes[item.id!] === undefined) {
        this.expandedNodes[item.id!] = true; // Default expanded
      }
      map[item.id!] = {
        ...item,
        children: [],
        expanded: this.expandedNodes[item.id!]
      };
    });

    filtered.forEach(item => {
      const node = map[item.id!];
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // 3. Sorting logic by hierarchical code
    const sortByCode = (a: any, b: any) => {
      const codeA = a.codigo || '';
      const codeB = b.codigo || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    };

    roots.sort(sortByCode);
    const sortChildren = (node: any) => {
      node.children.sort(sortByCode);
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    // 4. Flatten tree for performance rendering
    this.displayRows = [];
    const traverse = (nodes: any[], level = 0) => {
      nodes.forEach(node => {
        let levelName = 'Macro';
        if (level === 1) levelName = 'Grupo';
        else if (level >= 2) levelName = 'Subgrupo';

        this.displayRows.push({
          ...node,
          level,
          levelName,
          hasChildren: node.children && node.children.length > 0
        });

        if (node.expanded && node.children && node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      });
    };

    traverse(roots);
  }

  toggleNode(row: any, event: Event) {
    event.stopPropagation();
    this.expandedNodes[row.id] = !this.expandedNodes[row.id];
    this.processTree();
  }

  exportCSV() {
    const csvRows = [];
    csvRows.push('ID,Codigo,Nome,Descricao,Tipo,CategoriaFinanceira,OrcamentoPrevisto,LimiteMaximo,Ativo,AceitaLancamento');
    
    this.allCostCenters.forEach(cc => {
      const id = cc.id || '';
      const cod = cc.codigo || '';
      const nome = cc.nome ? `"${cc.nome.replace(/"/g, '""')}"` : '';
      const desc = cc.descricao ? `"${cc.descricao.replace(/"/g, '""')}"` : '';
      const tipo = cc.tipo || '';
      const cat = cc.categoriaFinanceira || '';
      const orc = cc.orcamentoPrevisto || '';
      const lim = cc.limiteMaximo || '';
      const ativo = cc.ativo ? 'Sim' : 'Não';
      const aceita = cc.aceitaLancamento ? 'Sim' : 'Não';
      
      csvRows.push(`${id},${cod},${nome},${desc},${tipo},${cat},${orc},${lim},${ativo},${aceita}`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "centros_de_custo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Centros de Custo',
        endpointUrl: 'financial/cost-centers/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadCostCenters();
      }
    });

    await modal.present();
  }
}

