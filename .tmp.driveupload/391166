
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsersService } from '../../services/users/users';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonSelect, IonSelectOption, AlertController, IonCard, IonGrid, IonRow, IonCol, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.page.html',
  styleUrls: ['./user-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonToast, IonSelect, IonSelectOption, IonCard, IonGrid, IonRow, IonCol, IonIcon]
})
export class UserDetailPage implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  userId: string | null = null;
  toastMessage = '';
  isToastOpen = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private alertController: AlertController
  ) {
    this.userForm = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', []], // Mandatory only on creation
      perfil: ['FINANCEIRO', [Validators.required]],
    });
  }

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId && this.userId !== 'new') {
      this.isEditMode = true;
      this.loadUser(this.userId);
    } else {
      // Set password required validator for new users
      this.userForm.get('senha')?.addValidators(Validators.required);
    }
  }

  loadUser(id: string) {
    this.usersService.findOne(id).subscribe(user => {
      const userData = { ...user };

      // Flatten nested perfil object to name string for the form select
      if (userData.perfil && typeof userData.perfil === 'object' && 'nome' in userData.perfil) {
        userData.perfil = (userData.perfil as any).nome;
      }

      this.userForm.patchValue(userData);
      this.userForm.get('senha')?.setValue(''); // Clear password field
      this.userForm.get('senha')?.removeValidators(Validators.required); // Password optional on edit
    });
  }

  async onSubmit() {
    if (this.userForm.valid) {
      const userData = this.userForm.value;

      // If edit mode and password is empty, remove it from payload
      if (this.isEditMode && !userData.senha) {
        delete userData.senha;
      }

      if (this.isEditMode && this.userId) {
        this.usersService.update(this.userId, userData).subscribe({
          next: () => this.showToast('Usuário atualizado com sucesso!'),
          error: () => this.showToast('Erro ao atualizar usuário.')
        });
      } else {
        this.usersService.create(userData).subscribe({
          next: () => {
            this.showToast('Usuário criado com sucesso!');
            this.router.navigate(['/users']);
          },
          error: () => this.showToast('Erro ao criar usuário.')
        });
      }
    }
  }

  async onDelete() {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este usuário?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            if (this.userId) {
              this.usersService.delete(this.userId).subscribe({
                next: () => {
                  this.showToast('Usuário excluído com sucesso!');
                  this.router.navigate(['/users']);
                },
                error: () => this.showToast('Erro ao excluir usuário.')
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
