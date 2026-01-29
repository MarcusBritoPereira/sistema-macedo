
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular'; // Use IonicModule for lazy loading or import specific components
import { AuthService } from '../services/auth/auth.service';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonText]
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.loginForm = this.fb.group({
      email: ['admin@erp.com', [Validators.required, Validators.email]],
      senha: ['admin123', [Validators.required]]
    });
  }

  ngOnInit() {
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, senha } = this.loginForm.value;
      this.auth.login(email, senha).subscribe({
        next: () => {
          this.errorMessage = '';
        },
        error: (err) => {
          this.errorMessage = 'Credenciais inválidas ou erro no servidor.';
          console.error(err);
        }
      });
    }
  }
}
