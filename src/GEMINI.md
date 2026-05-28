# Lotochoco - Estructura del Proyecto (Directorio SRC)

Esta es la nueva estructura organizada del proyecto siguiendo una arquitectura de **Módulos por Dominio** y **Núcleo Compartido**.

## Directorio `src/`

### 1. `src/app/`
- Rutas de Next.js (App Router).
- `layout.tsx` global y sub-layouts.
- Páginas principales que actúan como orquestadores de features.

### 2. `src/features/`
Cada subcarpeta representa un dominio de negocio completo.
- `auth/`: Autenticación, sesión y perfil de usuario.
- `sales/`: Punto de venta, carrito y procesamiento de ventas.
- `tickets/`: Gestión, búsqueda y anulación de tickets.
- `results/`: Registro y procesamiento de resultados de sorteos.
- `winners/`: Gestión de ganadores y pagos.
- `cash/`: Control de caja, sesiones y movimientos.
- `dashboard/`: Resúmenes y métricas en tiempo real.
- `games/`: Configuración de juegos y horarios.
- `reports/`: Generación de reportes de ventas y premios.
- `updater/`: Sistema de actualización de la aplicación.
- `pyramid/`: Herramientas auxiliares (Pirámide de la suerte).

**Estructura interna de una Feature:**
- `components/`: Componentes específicos del dominio.
- `hooks/`: Lógica de React y estado local.
- `services/`: Acceso a datos (SQL) y servicios externos.
- `repositories/`: Capa de datos pura (consultas SQL).
- `store/`: Estado global persistente (Zustand).
- `types/`: Definiciones de TypeScript del dominio.

### 3. `src/core/`
Lógica y recursos compartidos por toda la aplicación.
- `hooks/`: Hooks de utilidad general (mobile, UI).
- `lib/`: Configuraciones base (Supabase, eventos, utilidades).
- `services/`: Hardware (Impresoras, Bluetooth) y servicios globales.
- `styles/`: Estilos globales y variables de tema.
- `types/`: Interfaces globales del sistema.

### 4. `src/components/`
Componentes UI genéricos y Layouts base.
- `ui/`: Componentes base de Shadcn/UI.
- `layout/`: Layouts estructurales (MainLayout).
- `providers/`: Context Providers globales.

---

## Alias de Rutas (Path Aliases)
Usar siempre los alias definidos en `tsconfig.json` para evitar rutas relativas complejas:
- `@/*`: `src/*`
- `@/features/*`: `src/features/*`
- `@/core/*`: `src/core/*`
- `@/lib/*`: `src/core/lib/*`
- `@/services/*`: `src/core/services/*`
- `@/hooks/*`: `src/core/hooks/*`
- `@/components/*`: `src/components/*`
