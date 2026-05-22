
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { UsersService, Usuario } from '../../services/users/users';
import { ImportModalComponent } from '../../shared/components/import-modal/import-modal.component';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, cloudUploadOutline, downloadOutline, search, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.page.html',
  styleUrls: ['./users-list.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton]
})
export class UsersListPage implements OnInit {
  users: Usuario[] = [];

  constructor(
    private usersService: UsersService,
    private modalCtrl: ModalController
  ) {
    addIcons({ add, cloudUploadOutline, downloadOutline, search, chevronForwardOutline });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers(event?: any) {
    this.usersService.findAll().subscribe({
      next: (data) => {
        this.users = data;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error(err);
        if (event) event.target.complete();
      }
    });
  }

  getProfileName(user: Usuario): string {
    if (!user.perfil) return '';
    if (typeof user.perfil === 'string') return user.perfil;
    return user.perfil.nome;
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Usuários',
        endpointUrl: 'users/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadUsers();
      }
    });

    await modal.present();
  }

  exportCSV() {
    const csvRows = [];
    csvRows.push('ID,Nome,Email,Perfil');
    
    this.users.forEach(u => {
      const id = u.id || '';
      const nome = u.nome ? `"${u.nome.replace(/"/g, '""')}"` : '';
      const email = u.email ? `"${u.email.replace(/"/g, '""')}"` : '';
      const perfil = this.getProfileName(u);
      csvRows.push(`${id},${nome},${email},"${perfil}"`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "usuarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
