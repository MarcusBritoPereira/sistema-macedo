
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { UsersService, Usuario } from '../../services/users/users';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.page.html',
  styleUrls: ['./users-list.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton]
})
export class UsersListPage implements OnInit {
  users: Usuario[] = [];

  constructor(private usersService: UsersService) {
    addIcons({ add });
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
}
