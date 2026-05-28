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
- **Componentes UI:** [Gluestack UI](https://gluestack.io/) (via gluestack-mcp) para un diseño 100% móvil y nativo.

---

## 3. Arquitectura de Datos (Crítico)
Lotochoco utiliza una **Arquitectura SQLite Relacional Directa**.

### Lo que DEBE hacerse:
- Usar consultas SQL crudas (`query`, `execute`) a través de `src/core/lib/db.ts`.
- Mantener el esquema relacional definido en `src/core/lib/db.ts` (Tablas: `Game`, `Ticket`, `Result`, `CashSession`, etc.).
- Realizar migraciones/sincronización manual de esquema en el método `ensureSchema` de `DatabaseManager`.

### Lo que NO debe hacerse (Prohibido):
- **NO USAR PRISMA:** Prisma no es compatible con el entorno nativo de Capacitor en Android. Cualquier intento de reinstalar Prisma romperá la aplicación.
- **NO USAR LocalStorage para datos masivos:** El `local-db.ts` basado en JSON está deprecado. Todo debe ir a SQLite.
- **NO USAR APIs externas:** La aplicación no tiene un backend centralizado.

---

## 4. Guía de Estilo y UI
El proyecto sigue una estética **"Premium Dark/Modern"** de alto contraste y es **100% móvil**.

### Principios de Diseño Móvil
- **Mobile-First:** La interfaz debe estar optimizada exclusivamente para pantallas táctiles de dispositivos móviles.
- **Componentes Gluestack:** Se debe priorizar el uso de componentes `gluestack-ui` (VStack, HStack, Box, etc.) para asegurar la consistencia nativa.
- **Sin etiquetas HTML:** Evitar el uso de `div`, `span`, `button`, etc. Usar en su lugar los componentes equivalentes de Gluestack.
- **TailwindCSS:** Usar clases de TailwindCSS exclusivamente a través de la propiedad `className` de los componentes de Gluestack.
- **Interactividad:** Feedback visual inmediato (Toasts de `sonner`), animaciones suaves de entrada (`animate-in`).

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

---

## 5. Sistema de Impresión
- **Método Principal:** `src/core/services/printer.service.ts` genera comandos ESC/POS.
- **Bluetooth:** Uso de `@capacitor-community/bluetooth-le` para comunicación directa con impresoras PT-210.
- **Fallback:** Generación de HTML para impresión vía sistema (navegador).

---

## 6. Reglas para Inteligencias Artificiales (Prompts Internos)
1. **Verificación de Entorno:** Antes de proponer un cambio en la DB, lee `src/core/lib/db.ts`. Si ves `PrismaClient`, detente; la arquitectura actual es SQL crudo.
2. **Consultas SQL:** Asegúrate de que las consultas SQL usen comillas dobles para nombres de tablas si son palabras reservadas (ej: `SELECT * FROM "Result"`).
3. **Manejo de Fechas:** Las fechas se almacenan como `TEXT` en formato ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`). Usa `date-fns` para formateo en la UI.
4. **Build Pipeline:** El comando de build es `npm run build && npx cap sync android`. Nunca asumas que existe un servidor `localhost` en el dispositivo final.
5. **Generación de UI:** Usar siempre el servidor MCP `gluestack-mcp` para generar pantallas y componentes siguiendo los principios de diseño móvil.

---

## 7. Estructura de Carpetas Clave (Refactorizado)
- `src/app`: Rutas y Layouts de Next.js (App Router).
- `src/features`: Módulos por dominio de negocio (Ventas, Resultados, etc.).
- `src/core/lib`: Configuración de DB, tipos globales y utilidades.
- `src/core/services`: Lógica de hardware (Impresoras) y servicios compartidos.
- `src/components/layout`: Layouts estructurales como `MainLayout`.

---

Documentación actualizada el miércoles, 27 de mayo de 2026.
Mantén este archivo actualizado tras cambios estructurales significativos.
