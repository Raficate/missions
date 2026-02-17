import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing-container">
      <div class="landing-card">
        <div class="emoji-hero">🧭</div>
        <h1 class="landing-title">Misiones Secundarias</h1>
        <p class="landing-subtitle">
          La vida tiene misiones principales... pero las secundarias son las que
          la hacen <span class="highlight">épica</span>.
        </p>
        <p class="landing-desc">
          Cada día recibirás una misión aleatoria para salir de tu zona de confort,
          descubrir algo nuevo o simplemente pasarlo bien. 🎲
        </p>

        @if (authService.loading()) {
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        } @else {
          <button class="btn-google" (click)="login()">
            <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar con Google
          </button>
        }

        @if (authService.error()) {
          <p class="error-msg">⚠️ {{ authService.error() }}</p>
        }

        <div class="landing-features">
          <div class="feature">
            <span class="feature-icon">🎯</span>
            <span>Una misión diaria</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📜</span>
            <span>Tu historial personal</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🏆</span>
            <span>Completa todas las misiones</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .landing-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .landing-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 24px;
      padding: 3rem 2rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .emoji-hero {
      font-size: 4rem;
      margin-bottom: 0.5rem;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .landing-title {
      font-size: 2rem;
      font-weight: 800;
      color: #2d1b69;
      margin: 0.5rem 0;
    }

    .landing-subtitle {
      font-size: 1.1rem;
      color: #555;
      line-height: 1.6;
      margin: 0.5rem 0 1rem;
    }

    .highlight {
      color: #7c3aed;
      font-weight: 700;
      font-style: italic;
    }

    .landing-desc {
      font-size: 0.95rem;
      color: #777;
      line-height: 1.5;
      margin-bottom: 2rem;
    }

    .btn-google {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 2rem;
      border: 2px solid #e0e0e0;
      border-radius: 50px;
      background: #fff;
      color: #333;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .btn-google:hover {
      border-color: #7c3aed;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.2);
      transform: translateY(-2px);
    }

    .google-icon {
      flex-shrink: 0;
    }

    .error-msg {
      color: #dc2626;
      font-size: 0.9rem;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #fef2f2;
      border-radius: 8px;
    }

    .landing-features {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.95rem;
      color: #555;
    }

    .feature-icon {
      font-size: 1.3rem;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #7c3aed;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e0e0;
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      .landing-card {
        padding: 2rem 1.25rem;
      }
      .landing-title {
        font-size: 1.6rem;
      }
    }
  `]
})
export class LandingComponent {
  readonly authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Si ya está logueado, redirigir al dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async login(): Promise<void> {
    await this.authService.loginWithGoogle();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }
}
