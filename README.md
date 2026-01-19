# Control de Proyectos (Firebase Hosting + Firestore + Storage + Functions)

Esta app es una base limpia para:
- Registrar **clientes**
- Crear **proyectos** (asignar responsable y base)
- Registrar **gastos** con **soporte (foto)**
- Administración de **usuarios** (solo admin)

## 1) Requisitos
- Node.js 18+
- Firebase CLI: `npm i -g firebase-tools`
- Un proyecto en Firebase (Plan Blaze)

## 2) Configuración Firebase (Console)
Activa:
- Authentication → Sign-in method → **Email/Password**
- Firestore Database
- Storage
- Functions

## 3) Pegar tu firebaseConfig
Edita:
`public/js/firebase.js` y reemplaza el objeto `firebaseConfig` con el tuyo.

## 4) Bootstrap del admin (1 sola vez)
1. Crea tu usuario admin en **Authentication** (Email/Password) desde la consola o desde la UI si ya tienes un usuario.
2. En `functions/index.js` reemplaza `ADMIN_EMAILS` con tu correo.
3. Despliega functions.
4. Entra a la app con tu cuenta y desde la consola del navegador ejecuta:

```js
import { functions, fb } from "./js/firebase.js";
const bootstrapAdmin = fb.httpsCallable(functions, "bootstrapAdmin");
await bootstrapAdmin();
```

Cierra sesión e ingresa nuevamente: ya tendrás role=admin (custom claim).

## 5) Deploy
Desde la carpeta del proyecto:

```bash
firebase login
firebase use <TU_PROJECT_ID>

# instalar dependencias de functions
cd functions
npm i
cd ..

# desplegar reglas + hosting + functions
firebase deploy
```

## 6) Estructura
- `public/` → Hosting (HTML/CSS/JS)
- `functions/` → Cloud Functions (crear usuarios)

## 7) Páginas
- `/login.html` → Login + reset password
- `/dashboard.html` → Panel
- `/clients.html` → Clientes (admin/líder)
- `/projects.html` → Proyectos (admin/líder)
- `/expenses.html` → Gastos (todos)
- `/users.html` → Usuarios (admin)
