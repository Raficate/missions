import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import {
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { firebaseAuth } from '../firebase.init';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private ngZone = inject(NgZone);
  private googleProvider = new GoogleAuthProvider();

  /** Signal reactivo del usuario */
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    // Forzar pantalla de selección de cuenta siempre
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // 1. Escuchar cambios de autenticación
    onAuthStateChanged(
      firebaseAuth,
      (user) => {
        this.ngZone.run(() => {
          this.currentUser.set(user);
          this.loading.set(false);
        });
      },
      (err) => {
        this.ngZone.run(() => {
          console.error('Auth state error:', err);
          this.error.set('Error al verificar la sesión');
          this.loading.set(false);
        });
      }
    );

    // 2. Procesar resultado del redirect (cuando vuelve de Google)
    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result?.user) {
          this.ngZone.run(() => {
            this.currentUser.set(result.user);
            this.loading.set(false);
          });
        }
      })
      .catch((err) => {
        this.ngZone.run(() => {
          console.error('Redirect result error:', err?.code, err?.message);
          if (err?.code !== 'auth/popup-closed-by-user') {
            this.error.set('Error al completar el inicio de sesión.');
          }
          this.loading.set(false);
        });
      });
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.error.set(null);
      this.loading.set(true);
      // Redirige a Google en la misma pestaña. El usuario elige su cuenta
      // y vuelve automáticamente a la app. getRedirectResult lo captura.
      await signInWithRedirect(firebaseAuth, this.googleProvider);
    } catch (err: any) {
      console.error('Login redirect error:', err?.code, err?.message);
      this.error.set('Error al iniciar sesión con Google. Inténtalo de nuevo.');
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      this.error.set(null);
      await signOut(firebaseAuth);
    } catch (err: any) {
      console.error('Logout error:', err);
      this.error.set('Error al cerrar sesión');
    }
  }
}
