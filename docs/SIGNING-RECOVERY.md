# Recuperación de la firma Android

La auditoría confirmó que el repositorio contenía una clave privada de firma utilizable y sus contraseñas. La identidad está comprometida: cambiar la contraseña o borrar el archivo no revoca las copias existentes.

El material retirado se conserva únicamente para recuperación en `/root/lotochoco-signing-quarantine`, fuera del repositorio, con directorios 0700 y archivos 0600. No debe restaurarse ni emplearse para firmar. Este cambio no reescribe el historial compartido; el historial, forks y clones siguen conteniendo la clave anterior. Coordinar cualquier limpieza del historial como una acción separada después de resolver la identidad de distribución.

Antes de distribuir:

1. Determinar si la clave expuesta era una clave de subida o la firma instalada. Si se utiliza Play App Signing y solo se comprometió la clave de subida, solicitar su restablecimiento en Play Console. Si se comprometió la firma instalada, gestionar la actualización de clave admitida por Play y verificar compatibilidad de las versiones Android soportadas.
2. Para APK distribuidos directamente, una clave nueva por sí sola no permite actualizar normalmente la instalación anterior. Definir y comprobar una migración compatible o una reinstalación acompañada de recuperación de datos antes de publicar. No prometer actualización transparente ni reutilizar la clave expuesta.
3. Crear la identidad de reemplazo fuera del repositorio, respaldarla en almacenamiento protegido y actualizar los certificados registrados ante proveedores cuando corresponda.
4. Configurar en el entorno GitHub `LotoChoco` los secretos `REPLACEMENT_ANDROID_KEYSTORE_BASE64`, `REPLACEMENT_ANDROID_STORE_PASSWORD`, `REPLACEMENT_ANDROID_KEY_PASSWORD`, `REPLACEMENT_ANDROID_KEY_ALIAS`, además de las variables públicas Supabase usadas por el build. Configurar revisores del entorno.
5. Ejecutar manualmente el workflow. Este valida calidad, rechaza el certificado comprometido y crea únicamente un borrador de release. Validar instalación, autenticación y migración en dispositivos antes de publicar el borrador.

Gradle obtiene la firma exclusivamente de `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS` y `RELEASE_KEY_PASSWORD` del entorno. CI decodifica el keystore en un archivo temporal protegido y lo elimina al finalizar el paso. Los secretos no deben incluirse en propiedades versionadas, logs ni artefactos.

Referencia: [Android Developers: firma, recuperación de upload key y actualización de clave](https://developer.android.com/studio/publish/app-signing).

## Candidato preparado el 6 de octubre de 2026

Se creó una identidad nueva en `/root/lotochoco-replacement-signing` (directorio 0700), respaldada allí y configurada en los secretos de reemplazo de GitHub. Los secretos anteriores se conservaron para no alterar otros procesos. El candidato 1.8.7 queda en borrador hasta completar la migración del backend y verificar la transición de instalaciones. Esto no revoca la identidad anterior.

El operador confirmó distribución por APK directo. No presentar este candidato como actualización instalable sobre el APK anterior: la identidad de firma cambió. Antes de cualquier reinstalación, resolver y verificar ventas pendientes, confirmar que los registros financieros están en Supabase y respaldar los datos locales necesarios. La recuperación de registros del servidor no garantiza la recuperación del carrito ni de otros datos exclusivamente locales. Validar primero el proceso en un dispositivo de prueba; una estrategia de rotación compatible requiere comprobación adicional según la versión Android.
