
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular'; // Use IonicModule for lazy loading or import specific components
import { AuthService } from '../services/auth/auth.service';
import { IonContent, IonInput, IonButton, IonText, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { business, barChart } from 'ionicons/icons';
import { ChangePasswordModalComponent } from './components/change-password-modal/change-password-modal.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonContent, IonInput, IonButton, IonText, IonSpinner, IonIcon]
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder, 
    private auth: AuthService,
    private modalCtrl: ModalController
  ) {
    addIcons({ business, 'bar-chart': barChart });
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  ngOnInit() {
  }

  async onSubmit() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { email, senha } = this.loginForm.value;
      this.auth.login(email, senha).subscribe({
        next: async (res) => {
          this.errorMessage = '';
          this.isSubmitting = false;
          
          if (res.user && res.user.precisaTrocarSenha) {
            const modal = await this.modalCtrl.create({
              component: ChangePasswordModalComponent,
              backdropDismiss: false,
              keyboardClose: false
            });
            
            await modal.present();
            
            const { data } = await modal.onDidDismiss();
            if (data && data.success) {
              window.location.href = '/financial/dashboard';
            } else {
              this.auth.logout();
            }
          }
        },
        error: (err) => {
          this.errorMessage = 'Credenciais inválidas ou erro no servidor.';
          this.isSubmitting = false;
          console.error(err);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

