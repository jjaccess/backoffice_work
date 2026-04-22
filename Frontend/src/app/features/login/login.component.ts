import { Component, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">

      <!-- Fondo con partículas decorativas -->
      <div class="bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>

      <div class="login-wrapper">

        <!-- Card -->
        <div class="login-card">

          <!-- Logo / Marca -->
          <div class="brand">
            <div class="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" fill="white"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="white" stroke-width="2.2"
                      stroke-linecap="round" fill="none"/>
                <circle cx="12" cy="16" r="1.6" fill="#4361ee"/>
              </svg>
            </div>
            <h1>Backoffice RSOC</h1>
            <p>Sistema de herramientas Corporativas</p>
          </div>

          <!-- Separador -->
          <div class="divider"></div>

          <!-- Formulario -->
          <form (ngSubmit)="login()" autocomplete="off">

            <div class="field">
              <label>Usuario</label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <input type="text" [(ngModel)]="username" name="username"
                       placeholder="Ingrese su usuario"
                       autocomplete="username" [class.has-error]="error" />
              </div>
            </div>

            <div class="field">
              <label>Contraseña</label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2"
                        stroke="currentColor" stroke-width="1.8"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" fill="none"/>
                </svg>
                <input type="password" [(ngModel)]="password" name="password"
                       placeholder="••••••••"
                       autocomplete="current-password" [class.has-error]="error" />
              </div>
            </div>

            <!-- Error -->
            <div *ngIf="error" class="error-msg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round"/>
              </svg>
              {{ error }}
            </div>

            <!-- Botón -->
            <button type="submit" class="btn-login" [disabled]="cargando">
              <span *ngIf="!cargando">Ingresar al sistema</span>
              <span *ngIf="cargando" class="btn-loading">
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2.5"
                          stroke-dasharray="40 20" stroke-linecap="round"/>
                </svg>
                Verificando...
              </span>
            </button>

          </form>

          <!-- Footer -->
          <p class="footer-text">Red Orinoquía y Caribe &nbsp;·&nbsp; v1.0</p>

        </div>

      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0d0d1a 0%, #131d35 50%, #0a2040 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
    }

    /* Formas decorativas de fondo */
    .bg-shapes { position: absolute; inset: 0; pointer-events: none; }
    .shape {
      position: absolute;
      border-radius: 50%;
      opacity: 0.06;
    }
    .shape-1 {
      width: 500px; height: 500px;
      background: #4361ee;
      top: -200px; right: -100px;
    }
    .shape-2 {
      width: 300px; height: 300px;
      background: #7b8cde;
      bottom: -100px; left: -80px;
    }
    .shape-3 {
      width: 200px; height: 200px;
      background: #4361ee;
      bottom: 120px; right: 80px;
    }

    /* Wrapper centrado */
    .login-wrapper {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 400px;
      padding: 0 20px;
    }

    /* Card principal */
    .login-card {
      background: rgba(255, 255, 255, 0.97);
      border-radius: 20px;
      padding: 40px 36px 32px;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.08),
        0 32px 64px rgba(0,0,0,0.4);
    }

    /* Marca */
    .brand {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4361ee, #3451d1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 24px rgba(67,97,238,0.35);
    }
    .brand h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .brand p {
      font-size: 0.8rem;
      color: #888;
      letter-spacing: 0.02em;
    }

    /* Separador */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
      margin-bottom: 24px;
    }

    /* Campos */
    .field { margin-bottom: 16px; }
    .field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #555;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .input-wrap { position: relative; }
    .input-icon {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: #aaa;
      pointer-events: none;
    }
    .input-wrap input {
      width: 100%;
      padding: 11px 14px 11px 40px;
      font-size: 0.9rem;
      color: #1a1a2e;
      background: #f8f9fc;
      border: 1.5px solid #e8eaf0;
      border-radius: 10px;
      outline: none;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .input-wrap input:focus {
      border-color: #4361ee;
      background: white;
      box-shadow: 0 0 0 3px rgba(67,97,238,0.1);
    }
    .input-wrap input.has-error {
      border-color: #e53e3e;
      background: #fff8f8;
    }
    .input-wrap input::placeholder { color: #bbb; }

    /* Error */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #fff5f5;
      color: #c53030;
      border: 1px solid #feb2b2;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 0.82rem;
      margin-bottom: 14px;
    }

    /* Botón */
    .btn-login {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #4361ee, #3451d1);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(67,97,238,0.35);
      margin-top: 4px;
    }
    .btn-login:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(67,97,238,0.4);
    }
    .btn-login:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }
    .btn-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* Spinner */
    .spin {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Footer */
    .footer-text {
      text-align: center;
      font-size: 0.72rem;
      color: #bbb;
      margin-top: 20px;
      letter-spacing: 0.02em;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .login-card { padding: 32px 24px 28px; }
    }
  `]
})
export class LoginComponent {

  username = '';
  password = '';
  cargando = false;
  error = '';

  private api = inject(ApiService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  login(): void {
    if (!this.username || !this.password) return;
    this.cargando = true;
    this.error = '';

    this.api.login(this.username, this.password).subscribe({
      next: (res) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
        }
        this.router.navigate(['/verificacion']);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Credenciales incorrectas';
      }
    });
  }
}