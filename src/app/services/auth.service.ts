import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  user,
  User,
  setPersistence,
  browserLocalPersistence
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private googleProvider = new GoogleAuthProvider();

  /** Observable del usuario actual de Firebase Auth */
  readonly user$: Observable<User | null> = user(this.auth);

  /** Signal reactivo del usuario */
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    // Asegurar persistencia local para que la sesión sobreviva recargas
    setPersistence(this.auth, browserLocalPersistence).catch(() => {});
    // Usar idioma del dispositivo en la pantalla de Google
    this.auth.useDeviceLanguage();

    this.user$.subscribe({
      next: (u) => {
        this.currentUser.set(u);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Auth error:', err);
        this.error.set('Error al verificar la sesión');
        this.loading.set(false);
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.error.set(null);
      this.loading.set(true);
      await signInWithPopup(this.auth, this.googleProvider);
    } catch (err: any) {
      console.warn('Popup login falló, intentando con redirect:', err?.code || err);

      // Si el popup se cerró, fue bloqueado o el dominio no está autorizado → fallback a redirect
      const retryWithRedirectCodes = new Set([
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/unauthorized-domain',
        'auth/operation-not-allowed'
      ]);

      if (retryWithRedirectCodes.has(err?.code)) {
        try {
          await signInWithRedirect(this.auth, this.googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error('Redirect login también falló:', redirectErr);
          this.error.set('Error al iniciar sesión. Revisa tu conexión o prueba otro navegador.');
        }
      } else {
        this.error.set('Error al iniciar sesión con Google');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      this.error.set(null);
      await signOut(this.auth);
    } catch (err: any) {
      console.error('Logout error:', err);
      this.error.set('Error al cerrar sesión');
    }
  }
}
