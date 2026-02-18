import { Injectable, inject, signal, computed, PLATFORM_ID, NgZone } from '@angular/core';
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
  private ngZone = inject(NgZone);

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
      this.user$.subscribe({
        next: (u) => {
          this.ngZone.run(() => {
            this.currentUser.set(u);
            this.loading.set(false);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error en user$ observable:', err);
            this.loading.set(false);
          });
        }
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
        // El observable user$ ya actualizará el signal automáticamente
      }
    } catch (error: any) {
      console.error('Error al procesar redirect de autenticación:', error);
      // Solo mostrar error si no es un error de "no hay redirect pendiente"
      if (error?.code !== 'auth/operation-not-allowed') {
        this.ngZone.run(() => {
          this.error.set('Error al completar el inicio de sesión.');
        });
      }
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const provider = new GoogleAuthProvider();
    // Forzar pantalla de selección de cuenta
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      this.ngZone.run(() => {
        this.error.set(null);
        this.loading.set(true);
      });
      console.log('Intentando login con popup...');
      
      // Ejecutar dentro de NgZone para evitar el warning
      await this.ngZone.runOutsideAngular(async () => {
        return await signInWithPopup(this.auth, provider);
      });
      
      console.log('Popup login exitoso');
      // El observable user$ actualizará el signal automáticamente
    } catch (error: any) {
      console.error('Error en popup login:', error?.code, error?.message, error);
      
      // Manejar error específico: Google no está habilitado en Firebase
      if (error.code === 'auth/operation-not-allowed') {
        this.ngZone.run(() => {
          this.error.set('⚠️ El método de autenticación con Google no está habilitado. Por favor, habilítalo en Firebase Console → Authentication → Sign-in method → Google.');
          this.loading.set(false);
        });
        return;
      }
      
      // Si el popup falla (bloqueado, cerrado, etc.), usar redirect como fallback
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/unauthorized-domain'
      ) {
        console.log('Popup falló, usando redirect...');
        try {
          await this.ngZone.runOutsideAngular(async () => {
            return await signInWithRedirect(this.auth, provider);
          });
          // No resetear loading aquí porque la página se va a redirigir
          return;
        } catch (redirectError: any) {
          console.error('Error en redirect:', redirectError?.code, redirectError?.message);
          this.ngZone.run(() => {
            this.error.set('Error al iniciar sesión. Inténtalo de nuevo.');
            this.loading.set(false);
          });
          throw redirectError;
        }
      } else {
        // Re-lanzar otros errores
        console.error('Login error no manejado:', error?.code, error?.message);
        this.ngZone.run(() => {
          this.error.set(`Error: ${error?.message || 'Error al iniciar sesión con Google'}`);
          this.loading.set(false);
        });
        throw error;
      }
    }
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.ngZone.run(() => {
        this.error.set(null);
      });
      await this.ngZone.runOutsideAngular(async () => {
        return await signOut(this.auth);
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      this.ngZone.run(() => {
        this.error.set('Error al cerrar sesión');
      });
    }
  }
}
