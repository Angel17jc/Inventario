# Arquitectura SaaS multiempresa

## Modelo de acceso

- `platform_admin`: administrador de la plataforma. Es el único rol global y se guarda en `auth.users.raw_app_meta_data` como `platform_role`.
- `organizations`: representa una licorería cliente.
- `organization_memberships`: relaciona un usuario de Supabase Auth con una licorería y un rol local: `owner`, `manager` o `cashier`.

Los roles de empresa no se guardan en el JWT. La API resolverá la membresía activa en cada petición, de modo que un cambio de permisos toma efecto inmediatamente y un usuario puede pertenecer a varias licorerías.

## Aislamiento

Todas las tablas de negocio recibirán un `organization_id` obligatorio en la siguiente migración. Las consultas y mutaciones de la API filtrarán por esa organización y las políticas RLS harán cumplir el mismo límite en PostgreSQL.

El usuario de plataforma no debe ser miembro de cada cliente: puede administrar las empresas mediante `platform_role = platform_admin`.

## Migración de datos actuales

La migración de fundación (`002_saas_foundation.sql`) no toca los datos existentes. La siguiente migración hará lo siguiente dentro de una transacción:

1. Crear una organización de legado.
2. Añadir `organization_id` inicialmente nullable a las tablas de negocio.
3. Asignar todos los registros actuales a la organización de legado.
4. Convertir `organization_id` en obligatorio y sustituir índices únicos globales por índices únicos por organización.

## Operación de administración

El panel de plataforma permitirá crear una organización y su propietario. El backend creará el usuario con Supabase Admin API, le asignará una membresía `owner` y nunca expondrá la clave de servicio al navegador.
