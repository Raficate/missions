# Reglas de Firestore para Misiones Secundarias

## Problema
Si ves el error "Error al cargar tus datos" o "Error de permisos", necesitas configurar las reglas de Firestore en Firebase Console.

## Solución

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **misiones-secundarias-1509e**
3. Ve a **Firestore Database** → **Rules**
4. Copia y pega estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario solo puede leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Denegar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Haz clic en **Publish** para guardar las reglas

## ¿Qué hacen estas reglas?

- **`match /users/{userId}`**: Permite acceso a la colección `users`
- **`allow read, write: if request.auth != null && request.auth.uid == userId`**: 
  - Solo usuarios autenticados (`request.auth != null`)
  - Solo pueden acceder a su propio documento (`request.auth.uid == userId`)
- **`match /{document=**}`**: Deniega todo lo demás por seguridad

## Verificación

Después de publicar las reglas, recarga la aplicación y debería funcionar correctamente.
