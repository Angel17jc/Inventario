# Despliegue seguro

## Variables requeridas

En producción configura siempre:

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Las claves usan el sistema nuevo de Supabase: `SUPABASE_SERVICE_ROLE_KEY` contiene una clave secreta (`sb_secret_...`) y `VITE_SUPABASE_ANON_KEY` una publicable (`sb_publishable_...`). Son independientes del JWT secret, así que revocar una no cierra las sesiones de los usuarios.

El build aborta si `VITE_SUPABASE_ANON_KEY` contiene una clave secreta, porque Vite incrusta las variables `VITE_*` en el bundle del navegador.

El servidor rechaza el inicio en producción si falta `SUPABASE_SERVICE_ROLE_KEY`. La clave de servicio se utiliza solo en Express para ejecutar operaciones transaccionales y administrar usuarios; nunca debe aparecer en variables `VITE_*`, código cliente ni repositorio.

## Migraciones

Ejecuta las migraciones SQL en orden numérico antes del despliegue. Conserva una copia de seguridad de la base antes de aplicar migraciones de datos.

## Verificación previa

Ejecuta antes de desplegar:

```bash
npm run check
npm test
npm run build
```

`npm run build` es el mismo comando que ejecuta Vercel (`vercel.json` lo fija), así
que lo que se comprueba aquí es lo que se publica. La API la compila Vercel por su
cuenta desde `api/index.ts`, con el resolvedor ESM nativo de Node: todo import
relativo necesita extensión `.js`. El CI falla si falta alguna.

## Monitor de disponibilidad para desarrollo

`GET /api/health/database` verifica de forma anónima que Supabase responde. No devuelve datos de organizaciones ni acepta operaciones de escritura.

El workflow `.github/workflows/supabase-keepalive.yml` llama a ese endpoint una vez al día. No necesita credenciales: la consulta la hace el servidor con su clave, no el workflow. Solo requiere una variable en GitHub, **Settings → Secrets and variables → Actions → Variables**:

- `APP_URL`: la URL del despliegue, por ejemplo `https://tu-app.vercel.app`.

Antes usaba la clave anon directamente contra Supabase. Dejó de funcionar cuando la migración 006 revocó los privilegios de `anon`, que es justamente lo que se buscaba.

El workflow es una ayuda temporal mientras el proyecto está en desarrollo. Para producción, usa Supabase Pro: el plan Free puede pausar proyectos inactivos.

Después de desplegar, verifica `GET /api/health`. El endpoint responde sin autenticación y no consulta ni expone datos de clientes.
