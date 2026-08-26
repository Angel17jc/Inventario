# Autenticación y roles

La aplicación usa Supabase Auth con tokens JWT. La base de datos no acepta accesos directos desde el navegador: las peticiones pasan por la API Express, que valida el token y el rol del usuario.

## Variables de entorno

Configura las cuatro variables de [`.env.example`](.env.example):

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: solo para el servidor.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: públicas, necesarias para iniciar sesión desde el navegador.

No expongas nunca `SUPABASE_SERVICE_ROLE_KEY` ni la incluyas en variables `VITE_*`.

## Roles

| Rol | Dónde vive | Qué puede hacer |
| --- | --- | --- |
| `platform_admin` | `auth.users.raw_app_meta_data.platform_role` | Crear licorerías cliente con su propietario, listarlas y suspenderlas. **No accede a los datos de ninguna.** |
| `owner` | Membresía en `organization_memberships` | Todo dentro de su licorería |
| `manager` | Membresía | Todo dentro de su licorería |
| `cashier` | Membresía | Leer, registrar movimientos y cobrar fiados |

Los roles de empresa no viajan en el JWT: la API resuelve la membresía en cada petición, así que un cambio surte efecto de inmediato.

## Crear usuarios

Los usuarios de una licorería se crean desde el panel de plataforma, no a mano en Supabase. Al crear la licorería se crea también su propietario con la contraseña inicial que indiques; entrégasela por un canal seguro y pídele que la cambie.

El administrador de plataforma sí se marca a mano. En Supabase, **Authentication → Users**, en **App metadata** del usuario:

```json
{ "platform_role": "platform_admin" }
```

Pide a ese usuario cerrar e iniciar sesión de nuevo para recibir un JWT actualizado.

## Permisos por operación

| Acción | owner / manager | cashier |
| --- | --- | --- |
| Consultar inventario, movimientos y fiados | Sí | Sí |
| Crear, editar o eliminar productos, categorías y proveedores | Sí | No |
| Registrar movimientos, fiados y pagos | Sí | Sí |

## Activar RLS

Ejecuta `database/migrations/001_enable_rls.sql` una sola vez en el SQL Editor de Supabase, después de haber creado las tablas principales y las de fiados. RLS bloquea todo acceso directo desde clientes; el servidor usa la clave de servicio exclusivamente en el entorno backend y aplica los permisos por JWT.
