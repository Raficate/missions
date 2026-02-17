import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

// Inicializar Firebase una sola vez
const app = initializeApp(environment.firebaseConfig);

// Exportar instancias singleton
export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
