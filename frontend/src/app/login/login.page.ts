
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular'; // Use IonicModule for lazy loading or import specific components
import { AuthService } from '../services/auth/auth.service';
import { IonContent, IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner, IonNote } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonContent, IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner, IonNote]
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isSubmitting = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.loginForm = this.fb.group({
      email: ['admin@erp.com', [Validators.required, Validators.email]],
      senha: ['admin123', [Validators.required]]
    });
  }

  ngOnInit() {
  }

  async onSubmit() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { email, senha } = this.loginForm.value;
      this.auth.login(email, senha).subscribe({
        next: () => {
          this.errorMessage = '';
          this.isSubmitting = false;
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
