# Configuración Inicial de Supabase para Lotochoco (Fase 9)

El sistema ahora soporta una arquitectura **Offline-First**. Para que la sincronización con la nube funcione correctamente, es necesario aprovisionar la base de datos de Supabase con el esquema exacto y las políticas RLS.

## Pasos de Instalación

1. Inicia sesión en tu panel de control de [Supabase](https://supabase.com).
2. Selecciona tu proyecto (el mismo que está configurado en las variables de entorno de tu archivo `.env`).
3. En la barra lateral izquierda, haz clic en **SQL Editor** (Editor SQL).
4. Crea una nueva consulta ("New query") y llámala `Setup Offline First`.
5. Copia todo el contenido del archivo adjunto `supabase_schema.sql` (que se encuentra en la raíz de este repositorio).
6. Pega el contenido en el editor SQL.
7. Haz clic en **Run** (Ejecutar) en la parte inferior derecha.

> **Importante:** la app ahora puede crear automáticamente una compañía y su membresía al iniciar sesión. Si ya tenías el esquema antiguo, vuelve a ejecutar el SQL actualizado para aplicar las nuevas políticas de `companies` y `company_users`.

> **Nota:** Si la ejecución es exitosa, verás el mensaje *Success. No rows returned*.

## Verificación

Para confirmar que todo se configuró correctamente:
1. Ve a **Table Editor** en el panel izquierdo.
2. Deberías ver las tablas: `companies`, `company_users`, `games`, `draw_schedules`, y `results`.
3. Ve a **Authentication > Policies** y verifica que aparezcan listadas las reglas (ej. "Users can view games of their company").

## Funcionamiento Multiempresa

Recuerda que, por seguridad, un usuario recién registrado no verá datos en otros dispositivos hasta que se le asocie a una compañía.
Debes crear un registro manualmente en la tabla `companies` y luego asociar tu `user_id` de Auth en la tabla `company_users`. El trigger SQL que creamos se asegurará de que todos los juegos nuevos hereden ese `company_id`.
