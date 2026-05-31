# Lotochoco - Guía Maestra de Arquitectura y Desarrollo

Este documento sirve como la "Fuente de Verdad" para el proyecto Lotochoco. Su propósito es guiar a desarrolladores (humanos e IAs) para mantener la integridad técnica, evitar regresiones arquitectónicas y respetar el diseño visual.

---

## 1. Visión del Proyecto
Lotochoco es un Sistema de Punto de Venta (POS) para lotería, diseñado para funcionar **100% offline** como una aplicación nativa de Android. 
- **Objetivo:** Ejecución local total, sin dependencia de servidores externos ni internet para la lógica de negocio.
- **Portabilidad:** Empaquetado con Capacitor para ejecutarse en dispositivos móviles y usar periféricos (impresoras térmicas Bluetooth).

---

## 2. Stack Tecnológico (Mandatorio)
Cualquier cambio debe respetar estas tecnologías. **NO introducir alternativas.**

- **Framework:** [Next.js](https://nextjs.org/) (App Router) con TypeScript.
- **Runtime Nativo:** [Capacitor](https://capacitorjs.com/).
- **Base de Datos:** [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite).
- **Estilos:** Tailwind CSS con `lucide-react` para iconografía.
- **Estado:** [Zustand](https://github.com/pmndrs/zustand) para estado persistente ligero (Carrito, Ajustes).
- **Componentes UI:** Shadcn/UI (basado en Radix UI).

---

## 3. Arquitectura de Datos (Crítico)
Lotochoco utiliza una **Arquitectura SQLite Relacional Directa**.

### Lo que DEBE hacerse:
- Usar consultas SQL crudas (`query`, `execute`) a través de `lib/db.ts`.
- Mantener el esquema relacional definido en `lib/db.ts` (Tablas: `Game`, `Ticket`, `Result`, `CashSession`, etc.).
- Realizar migraciones/sincronización manual de esquema en el método `ensureSchema` de `DatabaseManager`.

### Lo que NO debe hacerse (Prohibido):
- **NO USAR PRISMA:** Prisma no es compatible con el entorno nativo de Capacitor en Android. Cualquier intento de reinstalar Prisma romperá la aplicación.
- **NO USAR LocalStorage para datos masivos:** El `local-db.ts` basado en JSON está deprecado. Todo debe ir a SQLite.
- **NO USAR APIs externas:** La aplicación no tiene un backend centralizado.

---

## 4. Guía de Estilo y UI
El proyecto sigue una estética **"Premium Dark/Modern"** con alto contraste.

### Paleta de Colores
- **Fondo Principal:** `hsl(var(--background))` (Negro/Gris muy oscuro).
- **Primario:** `hsl(var(--primary))` (Verde esmeralda o Azul vibrante, según configuración).
- **Acentos:** 
  - Éxito/Ventas: Verde (`text-green-500`).
  - Alerta/Premios: Naranja/Rojo (`text-orange-500`, `text-red-500`).
  - Información: Azul (`text-blue-500`).

### Tipografía y Layout
- **Fuentes:** Inter o System Sans-serif para la interfaz. Monospace para números de ticket y resultados.
- **Bordes:** `rounded-2xl` o `rounded-3xl` para tarjetas y diálogos (estilo moderno/móvil).
- **Interactividad:** Feedback visual inmediato (Toasts de `sonner`), animaciones suaves de entrada (`animate-in`).

---

## 5. Sistema de Impresión
- **Método Principal:** `services/printer.ts` genera comandos ESC/POS.
- **Bluetooth:** Uso de `@capacitor-community/bluetooth-le` para comunicación directa con impresoras PT-210.
- **Fallback:** Generación de HTML para impresión vía sistema (navegador).

---

## 6. Reglas para Inteligencias Artificiales (Prompts Internos)
1. **Verificación de Entorno:** Antes de proponer un cambio en la DB, lee `lib/db.ts`. Si ves `PrismaClient`, detente; la arquitectura actual es SQL crudo.
2. **Consultas SQL:** Asegúrate de que las consultas SQL usen comillas dobles para nombres de tablas si son palabras reservadas (ej: `SELECT * FROM "Result"`).
3. **Manejo de Fechas:** Las fechas se almacenan como `TEXT` en formato ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`). Usa `date-fns` para formateo en la UI.
4. **Build Pipeline:** El comando de build es `npm run build && npx cap sync android`. Nunca asumas que existe un servidor `localhost` en el dispositivo final.

---

## 7. Estructura de Carpetas Clave
- `/app`: Rutas y Layouts de Next.js.
- `/components/pos`: Componentes específicos del punto de venta.
- `/hooks`: Lógica de React y acceso a servicios.
- `/lib`: Configuración de DB, tipos globales y utilidades.
- `/services`: Lógica de acceso a datos (SQL) y hardware (Impresoras).

---

Documentación generada el lunes, 18 de mayo de 2026.
Mantén este archivo actualizado tras cambios estructurales significativos.
