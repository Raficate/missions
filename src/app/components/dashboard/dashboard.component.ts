import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MissionsService } from '../../services/missions.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="user-info">
          @if (authService.currentUser(); as user) {
            @if (user.photoURL) {
              <img [src]="user.photoURL" alt="avatar" class="avatar" referrerpolicy="no-referrer" />
            }
            <span class="user-name">{{ user.displayName || 'Agente' }}</span>
          }
        </div>
        <div class="header-actions">
          <a routerLink="/history" class="btn-link">📜 Historial</a>
          <button class="btn-logout" (click)="logout()">Salir</button>
        </div>
      </header>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">{{ missionsService.completedCount }}</span>
          <span class="stat-label">Completadas</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ missionsService.totalMissions }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ getLevel() }}</span>
          <span class="stat-label">Nivel</span>
        </div>
      </div>

      <!-- Main content -->
      <div class="main-content">
        @if (missionsService.loading()) {
          <div class="loading-state">
            <div class="spinner-large"></div>
            <p>Preparando tu misión...</p>
          </div>
        } @else if (missionsService.error()) {
          <div class="error-state">
            <p class="error-icon">😵</p>
            <p>{{ missionsService.error() }}</p>
            <button class="btn-primary" (click)="retry()">Reintentar</button>
          </div>
        } @else if (missionsService.allCompleted()) {
          <!-- Todas completadas -->
          <div class="mission-card all-done">
            <div class="card-emoji">🏆</div>
            <h2>¡LEYENDA!</h2>
            <p class="card-text">Has completado TODAS las misiones secundarias. Eres oficialmente épico/a.</p>
            <button class="btn-primary btn-reset" (click)="resetMissions()">
              🔄 Reiniciar aventura
            </button>
            <a routerLink="/history" class="btn-secondary">Ver historial completo</a>
          </div>
        } @else if (missionsService.todayCompleted()) {
          <!-- Misión de hoy completada -->
          <div class="mission-card completed">
            <div class="card-emoji">🎉</div>
            <h2>¡Ya lo hiciste!</h2>
            <p class="card-text mission-text">{{ missionsService.todayMission()?.text }}</p>
            <p class="card-subtitle">Misión completada. Vuelve mañana para una nueva aventura.</p>
            <div class="streak-badge">
              🔥 Racha: {{ missionsService.completedCount }} misiones
            </div>
            <a routerLink="/history" class="btn-secondary">📜 Ver historial</a>
          </div>
        } @else if (missionsService.missionRevealed()) {
          <!-- Misión revelada pero no completada -->
          <div class="mission-card revealed" [class.animate-in]="animateCard()">
            <div class="card-emoji">🎯</div>
            <h2>Tu misión de hoy</h2>
            <p class="card-text mission-text">{{ missionsService.todayMission()?.text }}</p>
            <button class="btn-primary btn-complete" (click)="completeMission()">
              ✅ ¡Misión completada!
            </button>
            <p class="card-hint">Cumple la misión y pulsa el botón cuando la hayas hecho</p>
          </div>
        } @else {
          <!-- Sin misión aún -->
          <div class="mission-card waiting">
            <div class="card-emoji pulse">🎲</div>
            <h2>¿Preparado/a?</h2>
            <p class="card-text">Tu próxima misión secundaria te espera. ¿Te atreves?</p>
            <button class="btn-primary btn-reveal" (click)="revealMission()">
              Dame mi misión de hoy
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Header */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      margin-bottom: 1rem;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.8);
    }

    .user-name {
      font-weight: 600;
      color: #fff;
      font-size: 0.9rem;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-link {
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.4rem 0.75rem;
      border-radius: 20px;
      background: rgba(255,255,255,0.2);
      transition: background 0.3s;
    }
    .btn-link:hover {
      background: rgba(255,255,255,0.35);
    }

    .btn-logout {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      padding: 0.4rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-logout:hover {
      background: rgba(220, 38, 38, 0.7);
    }

    /* Stats */
    .stats-bar {
      display: flex;
      justify-content: space-around;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 1rem;
      margin-bottom: 2rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }

    .stat-label {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Main content */
    .main-content {
      display: flex;
      justify-content: center;
    }

    /* Mission card */
    .mission-card {
      background: rgba(255,255,255,0.95);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: cardAppear 0.5s ease-out;
    }

    @keyframes cardAppear {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .animate-in {
      animation: revealFlip 0.6s ease-out;
    }

    @keyframes revealFlip {
      0% {
        opacity: 0;
        transform: rotateY(90deg) scale(0.8);
      }
      50% {
        opacity: 1;
        transform: rotateY(-5deg) scale(1.02);
      }
      100% {
        transform: rotateY(0) scale(1);
      }
    }

    .card-emoji {
      font-size: 3.5rem;
      margin-bottom: 0.75rem;
    }

    .card-emoji.pulse {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .mission-card h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #2d1b69;
      margin: 0 0 1rem;
    }

    .card-text {
      font-size: 1rem;
      color: #555;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .mission-text {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2d1b69;
      padding: 1rem;
      background: linear-gradient(135deg, #f3e8ff, #ede9fe);
      border-radius: 16px;
      border-left: 4px solid #7c3aed;
    }

    .card-subtitle {
      font-size: 0.9rem;
      color: #888;
      margin-top: 1rem;
    }

    .card-hint {
      font-size: 0.8rem;
      color: #aaa;
      margin-top: 1rem;
      font-style: italic;
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
      margin-top: 0.5rem;
    }

    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-reveal {
      font-size: 1.2rem;
      padding: 1.1rem 2.5rem;
      animation: gentlePulse 3s ease-in-out infinite;
    }

    @keyframes gentlePulse {
      0%, 100% { box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); }
      50% { box-shadow: 0 8px 30px rgba(124, 58, 237, 0.6); }
    }

    .btn-complete {
      background: linear-gradient(135deg, #059669, #047857);
      box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);
    }
    .btn-complete:hover {
      box-shadow: 0 8px 25px rgba(5, 150, 105, 0.5);
    }

    .btn-reset {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    }
    .btn-reset:hover {
      box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
    }

    .btn-secondary {
      display: inline-block;
      margin-top: 1rem;
      color: #7c3aed;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      transition: background 0.3s;
    }
    .btn-secondary:hover {
      background: #f3e8ff;
    }

    /* States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem;
      color: #fff;
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      text-align: center;
      background: rgba(255,255,255,0.95);
      border-radius: 24px;
      padding: 2rem;
      width: 100%;
    }

    .error-icon {
      font-size: 3rem;
    }

    /* Streak badge */
    .streak-badge {
      display: inline-block;
      padding: 0.5rem 1.25rem;
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.9rem;
      color: #92400e;
      margin-top: 1rem;
    }

    /* Completed card */
    .mission-card.completed {
      border: 2px solid #d1fae5;
    }

    .mission-card.all-done {
      border: 2px solid #fde68a;
      background: linear-gradient(135deg, #fffbeb, #fff);
    }

    @media (max-width: 480px) {
      .dashboard-container {
        padding: 0.75rem;
      }
      .mission-card {
        padding: 2rem 1.25rem;
      }
      .btn-primary {
        padding: 0.875rem 1.5rem;
        font-size: 1rem;
      }
      .dashboard-header {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly missionsService = inject(MissionsService);
  private router = inject(Router);

  animateCard = signal(false);

  async ngOnInit(): Promise<void> {
    await this.missionsService.loadUserState();
  }

  async revealMission(): Promise<void> {
    this.animateCard.set(false);
    await this.missionsService.assignTodayMission();
    // Trigger animation
    setTimeout(() => this.animateCard.set(true), 50);
  }

  async completeMission(): Promise<void> {
    await this.missionsService.completeTodayMission();
  }

  async resetMissions(): Promise<void> {
    if (confirm('¿Seguro que quieres reiniciar todas las misiones? Tu historial se borrará.')) {
      await this.missionsService.resetAllMissions();
    }
  }

  async retry(): Promise<void> {
    await this.missionsService.loadUserState();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  getLevel(): string {
    const count = this.missionsService.completedCount;
    if (count === 0) return '🌱 Novato';
    if (count < 5) return '🔰 Curioso';
    if (count < 10) return '⚡ Activo';
    if (count < 15) return '🌟 Aventurero';
    if (count < 20) return '💎 Experto';
    if (count < 25) return '🔥 Maestro';
    return '👑 Leyenda';
  }
}
