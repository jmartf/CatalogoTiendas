# Catálogo Tiendas — Administración y catálogo público

Aplicación para administrar productos de varias tiendas y mostrarlos en un catálogo público mobile-first. Incluye autenticación, RLS, catálogos, productos, usuarios, fotografías privadas optimizadas y solicitudes por WhatsApp.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm
- Un proyecto Supabase
- Supabase CLI para ejecutar migraciones localmente o enlazar el proyecto remoto

## Ejecutar el frontend

1. Copie `.env.example` como `.env.local`.
2. Sustituya la URL y clave pública con las de **Project Settings > API Keys** en Supabase.
3. Instale dependencias y ejecute:

```bash
npm install
npm run dev
```

Nunca coloque la clave secreta o `service_role` en una variable que empiece con `VITE_`.

## Aplicar la base de datos

Para un proyecto nuevo, vincule Supabase CLI y revise qué se aplicará:

```bash
npx supabase login
npx supabase link --project-ref SU_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Las migraciones crean el modelo completo inicial, funciones privadas, generación atómica de códigos, RLS y el bucket privado de imágenes. Aunque esas tablas quedan preparadas, sus interfaces se implementarán solamente en las fases posteriores.

Después de actualizar el código y cuando existan migraciones pendientes, ejecute:

```bash
npx supabase db push --dry-run
npx supabase db push
```

En Fase 5 debe aplicarse `202608110002_product_image_management.sql`, que permite eliminar metadatos de fotografías únicamente cuando RLS confirma acceso al producto.

## Crear el primer administrador

1. En Supabase Dashboard abra **Authentication > Users** y cree un usuario con correo y contraseña.
2. El trigger crea automáticamente un perfil inactivo con rol `employee`.
3. En **SQL Editor**, ejecute sustituyendo el correo:

```sql
update public.profiles p
set role = 'admin', active = true, full_name = 'Administrador principal'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('admin@su-dominio.com');
```

Este bootstrap se realiza una sola vez desde el entorno administrativo de Supabase. Después, la futura pantalla de usuarios utilizará la función segura `admin-create-user`.

## Desplegar las funciones administrativas

La pantalla de usuarios de Fase 4 requiere desplegar `admin-users`:

```bash
npx supabase functions deploy admin-users
```

La función valida primero el JWT y el perfil administrador del llamante. Permite listar cuentas, crear empleados, editar perfiles, cambiar contraseñas y sincronizar permisos. La clave privilegiada permanece exclusivamente en el entorno de Supabase.

## Verificaciones

```bash
npm run lint
npm run build
npx supabase test db
```

Para las pruebas locales de base de datos se requiere Docker y `npx supabase start`.

## Prueba de aceptación con Supabase real

Antes de aprobar Fase 1, comprobar:

- El administrador activo puede iniciar sesión y abrir `/dashboard`.
- Credenciales incorrectas muestran un error sin revelar detalles internos.
- Un usuario con `active = false` es expulsado y RLS no le permite consultar catálogos ni productos.
- Un employee activo no puede consultar otros perfiles ni abrir `/administracion`.
- Una petición directa con la clave pública, sin JWT, no devuelve datos.
- La clave secreta no aparece en `.env.local`, en el código compilado ni en DevTools.

### Fase 2: catálogos

- El administrador puede abrir **Catálogos** desde la navegación.
- Puede crear y editar una tienda con un prefijo único de 2 a 8 caracteres.
- Puede crear una sucursal asociada a una tienda.
- Puede crear categorías, tallas, marcas y colores y definir su orden.
- Al desactivar un registro desaparece de la vista normal, pero reaparece al activar **Mostrar inactivos**.
- Un registro inactivo puede reactivarse y conserva su historial.
- Un usuario `employee` no puede abrir la ruta de catálogos ni modificar estas tablas mediante una petición directa.
- No existe una acción de eliminación física.

### Fase 3: productos

- Un admin puede crear un producto seleccionando tienda, sucursal y catálogos activos.
- El código aparece automáticamente con el prefijo correcto, por ejemplo `JUM-00001`.
- Crear dos productos consecutivos produce códigos distintos.
- El listado permite buscar por título o código y filtrar por estado y tienda.
- Editar un producto conserva su código y autor originales.
- Cambiar a `Vendido` asigna `sold_at`; devolverlo a otro estado limpia esa fecha.
- Desactivar un producto lo quita de la vista normal y **Ver desactivados** permite reactivarlo.
- Un employee solo puede ver y modificar productos de tiendas o sucursales autorizadas.
- Un employee no puede mover un producto a una ubicación no autorizada, ni siquiera mediante una petición manual.
- Categorías y ubicaciones inactivas permanecen visibles en productos históricos, pero no se ofrecen para registros nuevos.

### Fase 4: usuarios

- Despliegue `admin-users` antes de abrir la pantalla **Usuarios**.
- El administrador puede crear un empleado con una contraseña temporal de al menos 8 caracteres.
- El empleado puede iniciar sesión inmediatamente con ese correo y contraseña.
- Un permiso de tienda permite consultar y modificar productos de todas sus sucursales.
- Un permiso de sucursal limita al empleado únicamente a las sucursales seleccionadas.
- Un empleado sin ubicaciones puede iniciar sesión, pero no puede consultar ni crear productos.
- Al desactivar un usuario, sus peticiones dejan de acceder a datos aunque conserve temporalmente una sesión.
- Un administrador no puede desactivarse ni quitarse su propio rol desde la aplicación.
- El sistema impide desactivar o degradar al último administrador activo.
- Cambiar el rol de un usuario a administrador elimina asignaciones de ubicación redundantes.
- Ninguna clave `service_role` aparece en el navegador o en variables `VITE_*`.

### Fase 5: fotografías

- Aplique `202608110002_product_image_management.sql` con `npx supabase db push`.
- Un producto admite hasta 8 fotografías seleccionadas al mismo tiempo.
- Cada archivo original debe pesar como máximo 12 MB.
- El navegador reduce el lado mayor a 1600 px y convierte la fotografía a WebP antes de subirla.
- La primera fotografía de un producto queda como principal automáticamente.
- Se puede seleccionar otra fotografía como principal.
- Se puede eliminar una fotografía; si era la principal, otra ocupa su lugar.
- La fotografía principal aparece en el listado de productos.
- Las URLs son firmadas y caducan; el bucket `product-images` permanece privado.
- Un empleado autorizado puede gestionar imágenes de sus productos.
- Un empleado sin acceso al producto no puede listar, subir o eliminar sus objetos mediante una petición manual.
- Si una carga falla después de guardar el producto, el producto permanece guardado y puede reintentarse desde edición.

### Fase 6: catálogo público y WhatsApp

- Aplique `202608110003_public_catalog_and_whatsapp.sql` con `npx supabase db push`.
- En **Catálogos**, edite cada tienda y configure WhatsApp con código de país, solo números y sin `+`.
- Opcionalmente configure un WhatsApp diferente en cada sucursal.
- Abra `/catalogo` sin iniciar sesión y compruebe que carga correctamente.
- Las tarjetas utilizan imágenes en proporción 4:3 y se adaptan a teléfono.
- Solo aparecen productos activos con estado `available` o `reserved` y ubicaciones activas.
- Productos vendidos, desactivados o pertenecientes a ubicaciones inactivas no son públicos.
- El detalle muestra fotografías, precio, clasificación, código y ubicación.
- **Solicitar por WhatsApp** usa primero el número de la sucursal y, si está vacío, el de la tienda.
- El mensaje incluye título, código, precio y ubicación del producto.
- El botón abre WhatsApp, pero no reserva automáticamente la pieza.
- Un visitante anónimo solo tiene permisos de lectura sobre registros explícitamente públicos; no puede crear ni modificar datos.
- Las imágenes permanecen en un bucket privado y se entregan mediante URLs firmadas de corta duración.

### Ajuste: nombres generales de producto

- Aplique `202608110004_product_name_catalog.sql` con `npx supabase db push`.
- La migración convierte automáticamente los títulos actuales en opciones de **Nombres de producto**.
- El administrador gestiona esos nombres desde **Catálogos → Nombres de producto**.
- Al crear o editar una pieza, el nombre se selecciona mediante combobox y no se escribe libremente.
- Ejemplos recomendados: Camiseta, Pantalón, Vestido, Blusa, Falda, Bolso.
- Marca y color desaparecen de la interfaz administrativa y del catálogo público.
- Las tablas y valores antiguos de marca/color se conservan únicamente para evitar una eliminación destructiva del historial.
- PostgreSQL copia el nombre seleccionado a `products.title`, por lo que búsqueda, WhatsApp y registros históricos continúan funcionando.

### Ajuste: prefijos por sucursal

- Aplique `202608110005_branch_code_prefixes.sql` con `npx supabase db push`.
- Edite las sucursales existentes y asigne un prefijo único de 2 a 8 letras o números.
- Los productos con sucursal usan el prefijo y contador independiente de esa sucursal.
- Los productos con **Sin sucursal** usan el prefijo general de la tienda.
- Mientras una sucursal antigua no tenga prefijo, conserva temporalmente el contador de su tienda para no interrumpir el ingreso.
- PostgreSQL impide que una tienda y una sucursal compartan prefijo, incluso ante cambios simultáneos.
- Un prefijo que ya generó productos no puede modificarse ni reutilizarse.
- Los códigos existentes no se cambian.

### Corrección: empleados asignados solo a sucursales

- Aplique `202608110006_branch_employee_store_visibility.sql` con `npx supabase db push`.
- Un empleado asignado únicamente a una sucursal puede ver la tienda padre necesaria para completar el formulario.
- Esta visibilidad no concede acceso completo a la tienda: RLS continúa exigiendo la sucursal autorizada para consultar, crear o modificar productos.
- Si el empleado no tiene ninguna asignación, el formulario muestra un mensaje específico para solicitar revisión de permisos.

No se deben agregar pagos, carrito o checkout sin diseñar y aprobar una fase nueva.
