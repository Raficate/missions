import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MissionsService } from '../../services/missions.service';
import { Mission } from '../../models/mission.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="history-container">
      <header class="history-header">
        <a routerLink="/dashboard" class="btn-back">← Volver</a>
        <h1>📜 Historial de Misiones</h1>
      </header>

      @if (missionsService.loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando historial...</p>
        </div>
      } @else {
        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            [class.active]="activeTab() === 'completed'"
            (click)="activeTab.set('completed')"
          >
            ✅ Completadas ({{ completedMissions().length }})
          </button>
          <button
            class="tab"
            [class.active]="activeTab() === 'seen'"
            (click)="activeTab.set('seen')"
          >
            👁️ Vistas ({{ seenMissions().length }})
          </button>
          <button
            class="tab"
            [class.active]="activeTab() === 'all'"
            (click)="activeTab.set('all')"
          >
            📋 Todas ({{ missionsService.totalMissions }})
          </button>
        </div>

        <!-- Progress -->
        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="progressPercent()"
            ></div>
          </div>
          <p class="progress-text">
            {{ missionsService.completedCount }} / {{ missionsService.totalMissions }} misiones completadas
          </p>
        </div>

        <!-- Mission list -->
        <div class="missions-list">
          @if (activeTab() === 'completed') {
            @if (completedMissions().length === 0) {
              <div class="empty-state">
                <p class="empty-icon">🌱</p>
                <p>Aún no has completado ninguna misión. ¡A por la primera!</p>
              </div>
            } @else {
              @for (mission of completedMissions(); track mission.id) {
                <div class="mission-item completed">
                  <div class="mission-status">✅</div>
                  <div class="mission-info">
                    <p class="mission-item-text">{{ mission.text }}</p>
                    @if (getCompletedDateStr(mission.id)) {
                      <span class="mission-date">{{ getCompletedDateStr(mission.id) }}</span>
                    }
                  </div>
                </div>
              }
            }
          }

          @if (activeTab() === 'seen') {
            @if (seenMissions().length === 0) {
              <div class="empty-state">
                <p class="empty-icon">👀</p>
                <p>Aún no has visto ninguna misión. Pulsa el botón en el dashboard.</p>
              </div>
            } @else {
              @for (mission of seenMissions(); track mission.id) {
                <div class="mission-item" [class.completed]="isCompleted(mission.id)">
                  <div class="mission-status">
                    {{ isCompleted(mission.id) ? '✅' : '👁️' }}
                  </div>
                  <div class="mission-info">
                    <p class="mission-item-text">{{ mission.text }}</p>
                  </div>
                </div>
              }
            }
          }

          @if (activeTab() === 'all') {
            @for (mission of allMissions(); track mission.id) {
              <div class="mission-item"
                [class.completed]="isCompleted(mission.id)"
                [class.seen]="isSeen(mission.id)"
              >
                <div class="mission-status">
                  @if (isCompleted(mission.id)) {
                    ✅
                  } @else if (isSeen(mission.id)) {
                    👁️
                  } @else {
                    🔒
                  }
                </div>
                <div class="mission-info">
                  <p class="mission-item-text"
                    [class.locked]="!isSeen(mission.id) && !isCompleted(mission.id)"
                  >
                    {{ (isSeen(mission.id) || isCompleted(mission.id)) ? mission.text : '???' }}
                  </p>
                </div>
              </div>
            }
          }
        </div>

        <!-- Reset button -->
        @if (missionsService.completedCount > 0) {
          <div class="reset-section">
            <button class="btn-reset" (click)="resetMissions()">
              🔄 Reiniciar todas las misiones
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .history-container {
      min-height: 100vh;
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .history-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .history-header h1 {
      font-size: 1.5rem;
      color: #fff;
      font-weight: 800;
      margin: 0.75rem 0 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn-back {
      display: inline-block;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      background: rgba(255,255,255,0.2);
      transition: background 0.3s;
    }
    .btn-back:hover {
      background: rgba(255,255,255,0.35);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: rgba(255,255,255,0.15);
      border-radius: 16px;
      padding: 0.35rem;
    }

    .tab {
      flex: 1;
      padding: 0.6rem 0.5rem;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: rgba(255,255,255,0.8);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .tab.active {
      background: rgba(255,255,255,0.95);
      color: #2d1b69;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Progress */
    .progress-section {
      margin-bottom: 1.5rem;
    }

    .progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #10b981);
      border-radius: 8px;
      transition: width 0.5s ease;
    }

    .progress-text {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.8);
      text-align: center;
      margin-top: 0.5rem;
    }

    /* Missions list */
    .missions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .mission-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(255,255,255,0.9);
      border-radius: 16px;
      transition: transform 0.2s;
    }

    .mission-item:hover {
      transform: translateX(4px);
    }

    .mission-item.completed {
      border-left: 3px solid #10b981;
    }

    .mission-status {
      font-size: 1.2rem;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .mission-info {
      flex: 1;
    }

    .mission-item-text {
      font-size: 0.95rem;
      color: #333;
      line-height: 1.5;
      margin: 0;
    }

    .mission-item-text.locked {
      color: #ccc;
      font-style: italic;
    }

    .mission-date {
      font-size: 0.75rem;
      color: #999;
      margin-top: 0.25rem;
      display: inline-block;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.9);
      border-radius: 16px;
      color: #666;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem;
      color: #fff;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Reset */
    .reset-section {
      text-align: center;
      margin-top: 2rem;
      padding-bottom: 2rem;
    }

    .btn-reset {
      padding: 0.75rem 1.5rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-reset:hover {
      background: rgba(220, 38, 38, 0.6);
      border-color: rgba(220, 38, 38, 0.8);
    }

    @media (max-width: 480px) {
      .tab {
        font-size: 0.7rem;
        padding: 0.5rem 0.25rem;
      }
    }
  `]
})
export class HistoryComponent implements OnInit {
  readonly missionsService = inject(MissionsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  activeTab = signal<'completed' | 'seen' | 'all'>('completed');

  allMissions = computed(() => this.missionsService.allMissions());
  completedMissions = computed(() => this.missionsService.getCompletedMissions());
  seenMissions = computed(() => this.missionsService.getSeenMissions());

  progressPercent = computed(() => {
    const total = this.missionsService.totalMissions;
    if (total === 0) return 0;
    return (this.missionsService.completedCount / total) * 100;
  });

  async ngOnInit(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }
    // Cargar estado si no está cargado
    if (this.missionsService.missionState().lastAssignedDate === '' &&
        this.missionsService.completedCount === 0) {
      await this.missionsService.loadUserState();
    }
  }

  isCompleted(missionId: string): boolean {
    return this.missionsService.missionState().completedMissionIds.includes(missionId);
  }

  isSeen(missionId: string): boolean {
    return this.missionsService.missionState().seenMissionIds.includes(missionId);
  }

  getCompletedDateStr(missionId: string): string {
    const date = this.missionsService.getCompletedDate(missionId);
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  async resetMissions(): Promise<void> {
    if (confirm('¿Seguro que quieres reiniciar todas las misiones? Se borrará tu progreso.')) {
      await this.missionsService.resetAllMissions();
    }
  }
}
