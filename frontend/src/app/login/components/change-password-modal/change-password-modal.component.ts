import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton, IonText, IonSpinner, IonItem, IonLabel, IonNote, ModalController } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-change-password-modal',
  templateUrl: './change-password-modal.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton, IonText, IonSpinner, IonItem, IonLabel, IonNote]
})
export class ChangePasswordModalComponent {
  passwordForm: FormGroup;
  errorMessage: string = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private auth: AuthService
  ) {
    this.passwordForm = this.fb.group({
      novaSenha: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        ]
      ],
      confirmarSenha: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('novaSenha')?.value === g.get('confirmarSenha')?.value
      ? null : { mismatch: true };
  }

  async onSubmit() {
    if (this.passwordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { novaSenha } = this.passwordForm.value;
      
      this.auth.changePassword(novaSenha).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.modalCtrl.dismiss({ success: true });
        },
        error: (err) => {
          const backendMessage = err?.error?.message;

          this.errorMessage = Array.isArray(backendMessage)
            ? backendMessage.join(' ')
            : backendMessage ||
              'Erro ao alterar a senha. Tente novamente.';
          this.isSubmitting = false;
          console.error(err);
        }
      });
    } else {
      this.passwordForm.markAllAsTouched();
    }
  }

  cancel() {
    this.modalCtrl.dismiss({ success: false });
  }
}
