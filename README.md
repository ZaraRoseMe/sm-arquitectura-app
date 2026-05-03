# SM Arquitectura — Plataforma de Gestión de Proyectos

Sistema completo de gestión de proyectos y tiempos para **SM Arquitectura**, construido con Next.js 15, Prisma, PostgreSQL y NextAuth v5.

---

## 📦 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router) |
| Estilos | Tailwind CSS |
| Backend | API Routes de Next.js |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | NextAuth v5 (Credentials) |
| Estado global | Zustand |
| PDF export | jsPDF + jspdf-autotable |
| Fechas | date-fns |
| Despliegue | Vercel |

---

## 🚀 Instalación y configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sm-arquitectura.git
cd sm-arquitectura
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
# PostgreSQL local (o Neon/Supabase para producción)
DATABASE_URL="postgresql://user:password@localhost:5432/sm_arquitectura"

# Genera con: openssl rand -base64 32
AUTH_SECRET="tu-secreto-muy-seguro-aqui"
```

### 4. Configurar base de datos

```bash
# Crear tablas en la base de datos
npm run db:push

# Poblar con datos de ejemplo
npm run db:seed
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 🔐 Credenciales de acceso (demo)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@smarquitectura.com | admin123 |
| Colaborador | ana@smarquitectura.com | user123 |
| Colaborador | luis@smarquitectura.com | user123 |
| Colaborador | maria@smarquitectura.com | user123 |

---

## ☁️ Despliegue en Vercel

### 1. Crear base de datos PostgreSQL en producción

Recomendados:
- **[Neon](https://neon.tech)** — PostgreSQL serverless gratuito
- **[Supabase](https://supabase.com)** — PostgreSQL con extras
- **[Railway](https://railway.app)** — Fácil y económico

### 2. Subir a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

O conecta directamente desde [vercel.com](https://vercel.com) con tu repositorio de GitHub.

### 3. Variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables, agrega:

```
DATABASE_URL=postgresql://...tu-url-de-produccion...
AUTH_SECRET=tu-secreto-seguro
```

### 4. Ejecutar migraciones en producción

En Vercel, el build command ya incluye `prisma db push` automáticamente (ver `vercel.json`).

Para poblar datos iniciales en producción, ejecuta:

```bash
DATABASE_URL="tu-url-produccion" npm run db:seed
```

---

## 🗄️ Estructura de la base de datos

### Modelos principales

#### `User`
```
id, name, email, password (hasheado), role (ADMIN|COLABORADOR)
```

#### `Project`
```
id, name, description, startDate, endDate, color
```

#### `Task`
```
id, name, description, startDate, endDate, status, progress
→ belongsTo: Project, User
```

#### `PauseLog`
```
id, taskId, userId, pausedAt, resumedAt, reason
→ Historial de pausas por tarea
```

#### `Notification`
```
id, userId, taskId, title, message, read
```

---

## 🧩 Módulos del sistema

### 🏠 Dashboard
- Estadísticas globales: proyectos activos, tareas en progreso, retrasadas, completadas
- Tabla de tareas recientes con estado y asignado
- Lista de proyectos con progreso visual
- **Admin:** gráfico de carga de trabajo por colaborador

### 📁 Proyectos
- Crear/editar/eliminar proyectos (solo admin)
- Vista de tarjetas con progreso, fechas, equipo y estado
- Filtros por búsqueda de texto
- Identificación visual por color por proyecto

### ✅ Tareas
- CRUD completo de tareas (admin) / actualización de estado (colaborador)
- Filtros por estado, proyecto y usuario
- **Botones de acción rápida:** Iniciar / Pausar / Reanudar / Terminar
- Sistema de pausa con motivo opcional y registro histórico
- Indicador visual de días restantes / retraso
- Barra de progreso editable

### ⚠️ Detección de conflictos
Cuando un admin crea o edita una tarea que se solaparía con otra del mismo usuario:
1. La API devuelve HTTP 409 con la lista de conflictos
2. Se muestra un modal con las tareas en conflicto
3. El admin puede elegir:
   - **Crear de todas formas** (fuerza el guardado)
   - **Reprogramar fechas** (vuelve al formulario)
   - **Asignar a otro colaborador** (vuelve al formulario)

### 📊 Diagrama Gantt
- Visualización por usuario, todas las tareas en una línea de tiempo
- Código de colores por estado (gris=pendiente, azul=progreso, amber=pausado, verde=terminado)
- Indicador de hoy con línea vertical
- Barras de progreso dentro de cada tarea
- **Alertas de conflicto** destacadas visualmente con borde naranja
- Controles de zoom (3 niveles: 20px, 28px, 40px por día)
- Navegación por meses
- **Exportación a PDF** con tabla completa de tareas

### 👥 Usuarios (solo Admin)
- Crear/editar/eliminar colaboradores
- Vista de tarjetas con rol, email, número de tareas activas
- Vista previa de las tareas en progreso de cada usuario
- Indicador de carga de trabajo

### 🔔 Notificaciones
- Se generan automáticamente al asignar tareas
- Badge de no-leídas en el header
- Marcar individualmente o todas como leídas
- Dropdown en tiempo real

---

## 🎨 Diseño UI/UX

- **Tipografía:** DM Sans (cuerpo) + Playfair Display (acentos)
- **Colores:** Neutros predominantes (grises, blancos) con acento en índigo (#4f52e5)
- **Modo oscuro:** Implementado con clase `.dark` de Tailwind
- Transiciones y animaciones CSS suaves
- Sidebar colapsable
- Diseño completamente responsive

---

## 📁 Estructura de carpetas

```
sm-arquitectura/
├── prisma/
│   ├── schema.prisma          # Modelos de base de datos
│   └── seed.ts                # Datos de ejemplo
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # NextAuth handler
│   │   │   ├── projects/      # CRUD proyectos
│   │   │   ├── tasks/         # CRUD tareas + conflictos
│   │   │   ├── users/         # CRUD usuarios
│   │   │   └── notifications/ # Notificaciones
│   │   ├── dashboard/         # Páginas protegidas
│   │   │   ├── page.tsx       # Dashboard principal
│   │   │   ├── projects/      # Página de proyectos
│   │   │   ├── tasks/         # Página de tareas
│   │   │   ├── gantt/         # Diagrama Gantt
│   │   │   └── users/         # Gestión de equipo
│   │   └── login/             # Página de login
│   ├── components/            # Componentes React
│   │   ├── layout/            # Sidebar + Header
│   │   ├── dashboard/         # Widgets del dashboard
│   │   ├── projects/          # Componentes de proyectos
│   │   ├── tasks/             # Componentes de tareas
│   │   ├── gantt/             # Diagrama Gantt
│   │   └── users/             # Gestión de usuarios
│   ├── lib/
│   │   ├── prisma.ts          # Singleton de Prisma
│   │   └── utils.ts           # Utilidades (formateo, colores, detección de conflictos)
│   ├── store/
│   │   └── useAppStore.ts     # Estado global con Zustand
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── auth.ts                # Configuración NextAuth
│   └── middleware.ts          # Protección de rutas
├── .env.example               # Variables de entorno de ejemplo
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## 🔒 Seguridad

- Contraseñas hasheadas con `bcryptjs` (cost factor 12)
- Sesiones JWT firmadas con `AUTH_SECRET`
- Middleware que protege todas las rutas `/dashboard/*`
- Verificación de rol en cada API route (admin vs colaborador)
- Los colaboradores solo pueden ver/modificar sus propias tareas

---

## 🛠️ Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:push      # Sincronizar schema con DB
npm run db:seed      # Poblar datos de ejemplo
npm run db:studio    # Abrir Prisma Studio (GUI de DB)
npm run db:generate  # Regenerar cliente de Prisma
npm run db:migrate   # Crear migración SQL
```

---

## 📝 Notas adicionales

- El Gantt muestra ±1 mes del mes actual (3 meses en total)
- La detección de conflictos ignora tareas con estado "TERMINADO"
- El PDF exportado incluye tabla de todas las tareas filtradas actualmente
- Las notificaciones se crean automáticamente al asignar tareas a otros usuarios
- El modo oscuro persiste en memoria de sesión (para persistencia usar localStorage)
