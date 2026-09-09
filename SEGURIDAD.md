# Seguridad

Este archivo es **el único sitio** donde se describe el modelo de seguridad. Si otro
documento contradice a este, el equivocado es el otro.

## La idea de la que parte todo

**El navegador no toca la base de datos.** El bundle solo usa Supabase para
autenticarse; cualquier lectura o escritura pasa por la API de Express, que valida el
token, resuelve la organización y aplica el rol.

Eso no es una preferencia de estilo: es lo que permite que la clave que viaja al
navegador sea inofensiva.

## Claves

| Variable | Qué es | Dónde vive |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **secreta** (`sb_secret_…`). Salta el RLS | Solo el servidor |
| `VITE_SUPABASE_ANON_KEY` | Clave **publicable** (`sb_publishable_…`) | Se incrusta en el bundle, es pública por diseño |
| `SUPABASE_ACCESS_TOKEN` | Token de la API de gestión, solo lectura | Solo el CI y tu máquina |

Las claves heredadas `anon` y `service_role` de Supabase están **desactivadas**.

Tres cosas impiden que la clave secreta se escape:

1. `vite.config.ts` **aborta el build** si `VITE_SUPABASE_ANON_KEY` no es publicable.
   Existe porque una vez llegó a compilarse dentro del bundle del navegador.
2. El servidor se niega a arrancar en producción sin `SUPABASE_SERVICE_ROLE_KEY`.
3. `.env` está en `.gitignore` y nunca estuvo en el historial.

**`SUPABASE_ACCESS_TOKEN` no debe poder leer `API Keys`.** Ese permiso da acceso a la
clave de servicio, que salta el RLS de todas las licorerías. Alcance **Project** sobre
un solo proyecto y **dos permisos de lectura**: `Project Settings` y `Database`. Nunca
el preset `Read-only`, que incluiría `API Keys`.

## Aislamiento entre licorerías

Es la propiedad que más caro sale perder, así que se defiende en cuatro capas:

1. **Columna.** Cada tabla de negocio lleva `organization_id` obligatorio.
2. **Consulta.** `backend/storage.ts` acota toda consulta a la organización del
   contexto. Hay un test que **falla el build si una consulta pierde ese filtro**.
3. **Base de datos.** Claves foráneas compuestas `(id, organization_id)` impiden que
   una fila apunte a otra de una empresa distinta, aunque el código se equivoque.
4. **RLS.** Activo en las nueve tablas, con los privilegios revocados para `anon` y
   `authenticated`. La clave publicable no puede leer nada.

Una organización **suspendida** queda sin acceso a la API.

## Roles

| Rol | Dónde vive | Qué puede |
|---|---|---|
| `platform_admin` | `auth.users.raw_app_meta_data.platform_role` | Crear licorerías cliente con su propietario, listarlas, suspenderlas. **No accede a los datos de ninguna** |
| `owner` | `organization_memberships` | Todo dentro de su licorería |
| `manager` | `organization_memberships` | Igual que `owner` salvo cambiar el nombre y el logo |
| `cashier` | `organization_memberships` | Leer, registrar ventas y cobrar fiados |

**En la práctica solo existe `owner`.** El alta de una licorería crea un único usuario,
su propietario, y no hay pantalla para añadir más: es una decisión de producto tomada,
no una funcionalidad pendiente. `manager` y `cashier` siguen en el tipo y en las guardas
porque el día que haga falta personal, el andamiaje está; hoy nadie los usa.

Los roles de empresa **no viajan en el JWT**. La API resuelve la membresía en cada
petición contra la base, así que revocar un permiso surte efecto de inmediato y un
claim robado no sirve para escalar.

### El administrador de plataforma no entra en los datos de nadie

`requireOrganizationContext` construye el contexto **solo** a partir de una membresía
activa, y el tipo `OrganizationContext` únicamente admite roles de empresa. Reintroducir
la excepción no compila.

Su acceso a los clientes se limita a nombre, propietario y estado. Nunca inventario,
movimientos ni fiados. Y **no puede suspender su propia licorería**, que lo dejaría
fuera del panel desde el que se reactiva.

## Autenticación

La sirve Supabase Auth. El token se valida **en el servidor** contra Supabase en cada
petición.

- **Contraseñas:** mínimo **ocho caracteres** con al menos un número o un símbolo. La
  regla vive en `shared/schema.ts` y hay un test que comprueba que el texto mostrado en
  pantalla coincide con lo que valida el esquema.
- **Sesiones en `sessionStorage`:** mueren al cerrar la pestaña y a los 30 minutos sin
  actividad. La caja suele ser una máquina compartida.
- **Recuperación de contraseña:** el enlace es de **un solo uso**. Los escáneres de
  correo lo consumen al previsualizarlo, así que la app detecta `otp_expired` y muestra
  una pantalla que lo explica en vez de un error críptico.

## Operaciones atómicas

Registrar una venta, fiar y cobrar un abono se ejecutan en funciones PostgreSQL con
**bloqueo de fila**. Dos cajas simultáneas no pueden dejar el stock inconsistente, y la
conversión de cajas a unidades ocurre dentro de la función: el tamaño de la caja no
puede cambiar entre que se lee y se aplica.

Esas funciones solo son ejecutables por el rol de servicio.

## Respuestas y registros

- Los errores internos **no** se devuelven al cliente. `backend/errors.ts` traduce a un
  mensaje seguro y un código.
- Los registros contienen **la línea de la petición, nunca el cuerpo de la respuesta**.
  Antes se registraban las respuestas completas, lo que enviaba nombres de clientes,
  saldos y existencias al almacenamiento de registros de la plataforma.
- Cabeceras de la API: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Cache-Control: no-store` y `Strict-Transport-Security`. El HTML añade una Content
  Security Policy desde `vercel.json`.

## Lo que a propósito no está

- **Rate limiting.** Descartado. El inicio de sesión lo sirve Supabase, que trae el
  suyo; lo que queda sin techo son las rutas de `/api` ya autenticado. En serverless un
  limitador en memoria da falsa seguridad, porque cada instancia cuenta por su lado.
