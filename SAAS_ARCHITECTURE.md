# Arquitectura SaaS multiempresa

## Orden de migraciones

Ejecuta las migraciones en orden numérico. Después de `003_scope_legacy_data_to_organization.sql`, ejecuta `004_apply_tenant_data_rls.sql` para limitar las lecturas directas de Supabase a la organización correspondiente. Las escrituras siguen siendo exclusivamente de la API, donde se aplican los permisos de rol.

## Modelo de acceso

- `platform_admin`: administrador de la plataforma. Es el único rol global y se guarda en `auth.users.raw_app_meta_data` como `platform_role`.
- `organizations`: representa una licorería cliente.
- `organization_memberships`: relaciona un usuario de Supabase Auth con una licorería y un rol local: `owner`, `manager` o `cashier`.

Los roles de empresa no se guardan en el JWT. La API resolverá la membresía activa en cada petición, de modo que un cambio de permisos toma efecto inmediatamente y un usuario puede pertenecer a varias licorerías.

## Aislamiento

Todas las tablas de negocio recibirán un `organization_id` obligatorio en la siguiente migración. Las consultas y mutaciones de la API filtrarán por esa organización y las políticas RLS harán cumplir el mismo límite en PostgreSQL.

El usuario de plataforma no es miembro de ningún cliente y **no puede leer ni escribir sus datos**. `requireOrganizationContext` construye el contexto únicamente a partir de una membresía activa, y el tipo `OrganizationContext` solo admite roles de empresa, de modo que la excepción no puede reintroducirse sin que el compilador lo señale.

Su único acceso a los clientes es `GET /api/platform/organizations`: nombres, propietario y estado. Nunca inventario, movimientos ni fiados.

## Migración de datos actuales

La migración de fundación (`002_saas_foundation.sql`) no toca los datos existentes. La siguiente migración hará lo siguiente dentro de una transacción:

1. Ejecutar `003_scope_legacy_data_to_organization.sql` después de la fundación.
2. Crear la organización `legacy-inventory` si aún no existe.
3. Añadir `organization_id` a las tablas de negocio y asignar todos los registros actuales a esa organización.
4. Convertir `organization_id` en obligatorio, crear índices únicos por organización y añadir claves foráneas compuestas entre entidades del mismo cliente.

## Operación de administración

El panel de plataforma hace tres cosas y ninguna más:

1. Crear una licorería cliente junto a su usuario propietario.
2. Listar las licorerías con su propietario y su estado.
3. Suspender o reactivar una licorería, lo que corta o restaura el acceso de su personal.

Cada cliente tiene un único usuario, el propietario, creado en el mismo acto que la licorería. El backend lo crea con Supabase Admin API, le asigna la membresía `owner` y nunca expone la clave de servicio al navegador. Si el propietario olvida su contraseña, la recupera por correo desde la pantalla de inicio de sesión.
