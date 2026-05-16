# SolaFit

Tu plan de comidas y entreno personalizado, calculado a partir de tus datos.

## Funcionalidades

- 📊 **Inicio**: dashboard del día, qué comer y entrenar hoy
- 🍳 **Comidas**: plan semanal automático con lista de la compra
- 🏋️ **Entreno**: plan de 4 semanas con progresión (fuerza + running con VDOT)
- 👤 **Yo**: perfil, preferencias y cálculo de macros

## 🚀 Cómo desplegar (5 minutos)

### 1. Subir a GitHub
1. Crea cuenta en [github.com](https://github.com) si no tienes.
2. Crea un nuevo repositorio público llamado `solafit`.
3. Sube todos los archivos de este ZIP al repo.

### 2. Conectar con Vercel
1. Crea cuenta en [vercel.com](https://vercel.com) usando "Continue with GitHub".
2. Pulsa **Add New → Project**.
3. Importa el repo `solafit` y pulsa **Deploy** (no toques nada).
4. Espera 30 segundos. Te dará una URL tipo `solafit-tuusuario.vercel.app`.

### 3. Instalar en iPhone
1. Abre la URL en **Safari** (importante, no Chrome).
2. Pulsa el botón **compartir** → **Añadir a pantalla de inicio**.
3. Listo, ya tienes el icono como una app.

## 📂 Estructura del proyecto

```
solafit/
├── index.html       Pantalla principal con las 4 pestañas
├── styles.css       Diseño completo (blanco roto + soft UI)
├── app.js           Lógica, navegación y persistencia
├── manifest.json    Configuración PWA
├── sw.js            Service Worker (modo offline)
└── icons/           Iconos para instalación
```

## 💾 Tus datos

Todos tus datos se guardan en local (en tu propio móvil), no van a ningún servidor. Si cambias de móvil, perderás los datos.

## 🔧 Versión

`1.0.0` — App completa con las 4 pantallas integradas.
