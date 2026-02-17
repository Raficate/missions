import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import {
  signInWithPopup,
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
    // Escuchar cambios de autenticación con Firebase SDK directo
    onAuthStateChanged(
      firebaseAuth,
      (user) => {
        // NgZone.run para que Angular detecte el cambio (callback externo)
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
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.error.set(null);
      this.loading.set(true);
      await signInWithPopup(firebaseAuth, this.googleProvider);
      // onAuthStateChanged se encargará de actualizar currentUser
    } catch (err: any) {
      console.error('Login error:', err?.code, err?.message);
      if (err?.code === 'auth/popup-closed-by-user' ||
          err?.code === 'auth/cancelled-popup-request') {
        // El usuario cerró el popup voluntariamente, no mostrar error
        this.loading.set(false);
        return;
      }
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
