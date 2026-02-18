import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Auth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  user,
  User
} from '@angular/fire/auth';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);

  /** Observable del usuario actual de Firebase Auth */
  readonly user$: Observable<User | null>;

  /** Signal reactivo del usuario */
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.user$ = user(this.auth);
      // Suscribirse al observable para actualizar el signal
      this.user$.subscribe((u) => {
        this.currentUser.set(u);
        this.loading.set(false);
      });
      // Manejar el resultado del redirect cuando el usuario vuelve
      this.handleRedirectResult();
    } else {
      this.user$ = of(null);
      this.loading.set(false);
    }
  }

  private async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.auth);
      if (result) {
        console.log('Usuario autenticado mediante redirect:', result.user.email);
      }
    } catch (error: any) {
      console.error('Error al procesar redirect de autenticación:', error);
      this.error.set('Error al completar el inicio de sesión.');
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const provider = new GoogleAuthProvider();

    try {
      this.error.set(null);
      this.loading.set(true);
      // Intentar con popup primero (como en resolutions)
      await signInWithPopup(this.auth, provider);
    } catch (error: any) {
      // Si el popup falla (bloqueado, cerrado, etc.), usar redirect como fallback
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/unauthorized-domain'
      ) {
        console.log('Popup bloqueado o cerrado, usando redirect...');
        await signInWithRedirect(this.auth, provider);
      } else {
        // Re-lanzar otros errores
        console.error('Login error:', error?.code, error?.message);
        this.error.set('Error al iniciar sesión con Google. Inténtalo de nuevo.');
        this.loading.set(false);
        throw error;
      }
    }
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.error.set(null);
      await signOut(this.auth);
    } catch (err: any) {
      console.error('Logout error:', err);
      this.error.set('Error al cerrar sesión');
    }
  }
}
