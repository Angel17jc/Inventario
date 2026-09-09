# Operación

Cómo se pone en marcha, se despliega y se comprueba.

## Puesta en marcha

Node 22 (es la versión que usa el CI).

```bash
npm install
cp .env.example .env      # y rellena los valores
npm run dev               # http://localhost:5000
```

### Variables de entorno

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # solo servidor
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...      # va al navegador
SUPABASE_ACCESS_TOKEN=sbp_...                  # opcional, solo para npm run types:db
```

Las cuatro primeras están en Supabase → Settings → API Keys. La quinta se explica más
abajo. Ver [SEGURIDAD.md](SEGURIDAD.md) para qué puede hacer cada una.

En Vercel hay que configurar las cuatro **antes del primer build**: las `VITE_*` se
incrustan al compilar, no se leen en tiempo de ejecución.

## Base de datos

En el SQL Editor de Supabase, ejecuta `database/migrations/` **por número**, de la `001`
a la última.

**No hay un volcado del esquema aparte.** Las migraciones son la única descripción de la
base; una segunda copia solo serviría para desviarse de ella sin que nadie lo note. El
esquema tampoco se sincroniza desde código: `drizzle-kit` y `db:push` se eliminaron
porque habrían borrado el RLS, las funciones y las claves foráneas compuestas.

Cada migración asume aplicada la anterior. Haz copia de seguridad antes de las que mueven
datos.

**Aplica la migración antes de desplegar el código que la necesita.** Al revés rompe
producción: ya pasó con una columna que el código pedía y la base todavía no tenía, y la
app devolvía 500 a todo el mundo.

### Configuración de Supabase

En **Authentication → URL Configuration**:

- **Site URL** — la URL del despliegue
- **Redirect URLs** — esa misma URL con `/**`

Sin esto el enlace de recuperación lleva al sitio equivocado y **Supabase no avisa**:
acepta el `redirect_to` y cae en silencio al Site URL.

El correo integrado de Supabase está limitado a unos pocos envíos **por hora**. Con
varias licorerías reales pidiendo enlaces el mismo día, algunos no llegarán y no habrá
error visible. Si un cliente dice que «no llega el correo», el límite es la primera
sospecha. La solución es SMTP propio (Authentication → SMTP Settings), que necesita una
**clave SMTP**, no una API key, y un **dominio propio**: los correos gratuitos como
`@gmail.com` no se pueden autenticar.

## Tipos de la base

`backend/database.types.ts` **se genera, no se escribe**:

```bash
npm run types:db
```

Baja el esquema real desde la API de gestión de Supabase. Necesita
`SUPABASE_ACCESS_TOKEN`: alcance **Project** sobre un solo proyecto y **dos permisos de
lectura**, `Project Settings` y `Database`. Nada más — ver [SEGURIDAD.md](SEGURIDAD.md).

No usa el CLI de Supabase a propósito: son 30 MB y su formato de salida cambia entre
versiones, lo que convertiría el guard del CI en una fuente de falsas alarmas.

> **El token vence a los 90 días.** El actual se creó el **8 de septiembre de 2026**, así
> que hacia el **7 de diciembre de 2026** el paso del CI empezará a dar 401. El error
> **no dirá que venció**: si aparece, es esto. Se renueva en Supabase → Account → Access
> Tokens y se repone en GitHub → Settings → Secrets and variables → Actions.

## Antes de cada entrega

```bash
npm run check
npm test
npm run build
```

Usa `npm run check`, no `npx tsc`: `npx` puede resolver otro TypeScript y fallar con
`TS5103` antes de compilar nada, lo que se parece mucho a «sin errores».

## Integración continua

`.github/workflows/ci-cd.yml` corre en cada push y cada pull request. Además de instalar,
comprobar tipos, pasar los tests y compilar, **falla** si:

| Guard | Qué detecta |
|---|---|
| `npm audit --omit=dev` | Una dependencia que se publica tiene una vulnerabilidad conocida |
| Tipos al día | `database.types.ts` no coincide con la base. Se salta, sin fallar, si no hay token |
| Imports sin extensión | Un import relativo sin `.js`, que rompería la función en Vercel |
| Hoja de estilos < 20 kB | Tailwind no encontró los archivos fuente |

Los dos últimos nacieron de fallos reales que pasaban tipos, tests y build sin quejarse y
solo se manifestaban en producción.

El job de despliegue está **inactivo** salvo que definas la variable de repositorio
`DEPLOY_VIA_ACTIONS` a `true`. Por defecto despliega la integración de Git de Vercel;
activar ambos duplicaría los despliegues.

### Keepalive

`.github/workflows/supabase-keepalive.yml` mantiene despierto el proyecto de Supabase,
que en el plan Free se pausa tras una semana sin actividad en la base.

Consulta PostgREST directamente con la clave publicable. La migración 006 revocó todos
los privilegios de ese rol, así que la respuesta esperada es que **Postgres rechace la
consulta** (`42501`). Ese es justamente el punto: el error prueba que la consulta llegó a
Postgres, que es lo que cuenta como actividad.

Necesita la variable `APP_URL` en GitHub. Es una ayuda temporal mientras el proyecto está
en desarrollo; en producción, Supabase Pro no pausa proyectos.

## Verificar un despliegue

Vercel tarda **varios minutos** en propagar. Probar antes de tiempo da falsos negativos:
compara el hash del bundle desplegado con el del build local antes de juzgar.

```bash
L=$(ls dist/public/assets/index-*.js | head -1 | sed 's|.*/||')
B=$(curl -s "https://tu-app.vercel.app/" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
[ "$B" = "$L" ] && echo DESPLEGADO
```

Cuidado con las URLs de despliegue con hash (`tu-app-rcf9fclp0-…`): apuntan a un
despliegue **inmutable** y sirven código viejo para siempre.

Después, `GET /api/health` responde sin autenticación y no consulta la base.
`GET /api/health/database` sí la consulta y **exige token**: dejarlo abierto permitía a
cualquiera gastar un viaje a Postgres por petición.

## Prueba de las funciones transaccionales

Ejecuta [atomic_operations_smoke_test.sql](database/tests/atomic_operations_smoke_test.sql)
en el SQL Editor. Requiere al menos un producto. Comprueba cuatro cosas:

1. Una entrada mueve el stock por lo que se pidió.
2. Una salida de 2 cajas de 12 descuenta **24 unidades**, no 2. La multiplicación ocurre
   dentro de la función, con la fila del producto bloqueada.
3. Vender por encima de lo contado **no se rechaza**: el stock queda en negativo.
4. Una presentación que no pertenece al producto se rechaza.

Usa `BEGIN` y `ROLLBACK`, así que no conserva cambios.
