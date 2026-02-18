import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import {
  Mission,
  MissionState,
  UserDoc,
  createEmptyMissionState
} from '../models/mission.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MissionsService {
  private http = inject(HttpClient);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  /** Todas las misiones disponibles */
  readonly allMissions = signal<Mission[]>([]);

  /** Estado de misiones del usuario actual */
  readonly missionState = signal<MissionState>(createEmptyMissionState());

  /** Misión de hoy */
  readonly todayMission = signal<Mission | null>(null);

  /** Si la misión de hoy ya fue completada */
  readonly todayCompleted = signal<boolean>(false);

  /** Si todas las misiones han sido completadas */
  readonly allCompleted = signal<boolean>(false);

  /** Estado de carga */
  readonly loading = signal<boolean>(false);

  /** Error */
  readonly error = signal<string | null>(null);

  /** Si la misión ya fue revelada hoy */
  readonly missionRevealed = signal<boolean>(false);

  constructor() {
    this.loadMissions();
  }

  /** Carga las misiones desde el JSON local */
  private async loadMissions(): Promise<void> {
    try {
      const missions = await firstValueFrom(
        this.http.get<Mission[]>('assets/missions.json')
      );
      this.allMissions.set(missions);
    } catch (err) {
      console.error('Error cargando misiones:', err);
      this.error.set('No se pudieron cargar las misiones');
    }
  }

  /** Obtiene la fecha local en formato YYYY-MM-DD (Europe/Madrid) */
  private getTodayDateString(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now); // "YYYY-MM-DD"
  }

  /** Genera un hash simple para seed determinista basado en uid + fecha */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /** Carga el estado del usuario desde Firestore */
  async loadUserState(): Promise<void> {
    // Esperar a que el usuario esté disponible
    let user = this.authService.currentUser();
    if (!user) {
      console.warn('Usuario no disponible aún, esperando...');
      // Esperar un poco y reintentar
      await new Promise(resolve => setTimeout(resolve, 500));
      user = this.authService.currentUser();
      if (!user) {
        console.error('Usuario no disponible después de esperar');
        this.error.set('Usuario no autenticado. Por favor, inicia sesión de nuevo.');
        return;
      }
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      console.log('Cargando estado del usuario:', user.uid);
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        console.log('Documento encontrado, cargando datos...');
        const data = snapshot.data() as UserDoc;
        this.missionState.set(data.missionState || createEmptyMissionState());
      } else {
        console.log('Documento no existe, creando nuevo usuario...');
        // Crear documento de usuario por primera vez
        const newState = createEmptyMissionState();
        const newDoc: UserDoc = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          missionState: newState
        };
        await setDoc(userDocRef, newDoc);
        console.log('Usuario creado en Firestore');
        this.missionState.set(newState);
      }

      this.checkTodayMission();
      console.log('Estado cargado correctamente');
    } catch (err: any) {
      console.error('Error cargando estado:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      
      // Mensajes de error más específicos
      if (err?.code === 'permission-denied') {
        this.error.set('Error de permisos. Verifica las reglas de Firestore en Firebase Console.');
      } else if (err?.code === 'unavailable') {
        this.error.set('Firestore no está disponible. Revisa tu conexión a internet.');
      } else {
        this.error.set(`Error al cargar tus datos: ${err?.message || 'Error desconocido'}`);
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Verifica si ya hay una misión asignada para hoy */
  private checkTodayMission(): void {
    const state = this.missionState();
    const today = this.getTodayDateString();
    const missions = this.allMissions();

    if (missions.length === 0) return;

    // Verificar si todas completadas
    const allDone = missions.every(m =>
      state.completedMissionIds.includes(m.id)
    );
    this.allCompleted.set(allDone);

    if (state.lastAssignedDate === today && state.lastMissionId) {
      const mission = missions.find(m => m.id === state.lastMissionId);
      if (mission) {
        this.todayMission.set(mission);
        this.missionRevealed.set(true);
        this.todayCompleted.set(
          state.completedMissionIds.includes(mission.id)
        );
      }
    } else {
      this.todayMission.set(null);
      this.missionRevealed.set(false);
      this.todayCompleted.set(false);
    }
  }

  /** Asigna la misión de hoy (se llama al pulsar el botón) */
  async assignTodayMission(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const missions = this.allMissions();
    const state = this.missionState();
    const today = this.getTodayDateString();

    // Si ya tenemos misión de hoy, no reasignar
    if (state.lastAssignedDate === today && state.lastMissionId) {
      const mission = missions.find(m => m.id === state.lastMissionId);
      if (mission) {
        this.todayMission.set(mission);
        this.missionRevealed.set(true);
        this.todayCompleted.set(
          state.completedMissionIds.includes(mission.id)
        );
        return;
      }
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Filtrar misiones no completadas
      const available = missions.filter(
        m => !state.completedMissionIds.includes(m.id)
      );

      // Si todas completadas
      if (available.length === 0) {
        this.allCompleted.set(true);
        this.loading.set(false);
        return;
      }

      // Selección determinista basada en uid + fecha
      const seed = this.simpleHash(user.uid + today);
      const index = seed % available.length;
      const selectedMission = available[index];

      // Actualizar estado
      const newSeenIds = state.seenMissionIds.includes(selectedMission.id)
        ? state.seenMissionIds
        : [...state.seenMissionIds, selectedMission.id];

      const newState: MissionState = {
        ...state,
        lastAssignedDate: today,
        lastMissionId: selectedMission.id,
        seenMissionIds: newSeenIds
      };

      // Guardar en Firestore
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, { missionState: newState });

      this.missionState.set(newState);
      this.todayMission.set(selectedMission);
      this.missionRevealed.set(true);
      this.todayCompleted.set(false);
    } catch (err: any) {
      console.error('Error asignando misión:', err);
      console.error('Error code:', err?.code);
      if (err?.code === 'permission-denied') {
        this.error.set('Error de permisos al guardar. Verifica las reglas de Firestore.');
      } else {
        this.error.set('Error al asignar tu misión. Inténtalo de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Marca la misión de hoy como completada */
  async completeTodayMission(): Promise<void> {
    const user = this.authService.currentUser();
    const mission = this.todayMission();
    if (!user || !mission) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const state = this.missionState();
      const newCompletedIds = state.completedMissionIds.includes(mission.id)
        ? state.completedMissionIds
        : [...state.completedMissionIds, mission.id];

      const newCompleted = {
        ...state.completed,
        [mission.id]: { completedAt: new Date() }
      };

      const newState: MissionState = {
        ...state,
        completedMissionIds: newCompletedIds,
        completed: newCompleted
      };

      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, { missionState: newState });

      this.missionState.set(newState);
      this.todayCompleted.set(true);

      // Verificar si todas completadas
      const allDone = this.allMissions().every(m =>
        newCompletedIds.includes(m.id)
      );
      this.allCompleted.set(allDone);
    } catch (err: any) {
      console.error('Error completando misión:', err);
      if (err?.code === 'permission-denied') {
        this.error.set('Error de permisos al guardar. Verifica las reglas de Firestore.');
      } else {
        this.error.set('Error al guardar. Inténtalo de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Reinicia todas las misiones completadas */
  async resetAllMissions(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const newState = createEmptyMissionState();
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, { missionState: newState });

      this.missionState.set(newState);
      this.todayMission.set(null);
      this.todayCompleted.set(false);
      this.allCompleted.set(false);
      this.missionRevealed.set(false);
    } catch (err: any) {
      console.error('Error reseteando misiones:', err);
      if (err?.code === 'permission-denied') {
        this.error.set('Error de permisos. Verifica las reglas de Firestore.');
      } else {
        this.error.set('Error al reiniciar misiones.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Obtiene las misiones vistas (con su texto) */
  getSeenMissions(): Mission[] {
    const state = this.missionState();
    const missions = this.allMissions();
    return state.seenMissionIds
      .map(id => missions.find(m => m.id === id))
      .filter((m): m is Mission => !!m);
  }

  /** Obtiene las misiones completadas (con su texto) */
  getCompletedMissions(): Mission[] {
    const state = this.missionState();
    const missions = this.allMissions();
    return state.completedMissionIds
      .map(id => missions.find(m => m.id === id))
      .filter((m): m is Mission => !!m);
  }

  /** Obtiene la fecha de completado de una misión */
  getCompletedDate(missionId: string): Date | null {
    const state = this.missionState();
    const entry = state.completed[missionId];
    if (entry?.completedAt) {
      return entry.completedAt instanceof Date
        ? entry.completedAt
        : new Date(entry.completedAt as any);
    }
    return null;
  }

  /** Número de misiones completadas */
  get completedCount(): number {
    return this.missionState().completedMissionIds.length;
  }

  /** Total de misiones */
  get totalMissions(): number {
    return this.allMissions().length;
  }
}
