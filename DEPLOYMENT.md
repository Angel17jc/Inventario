# Despliegue seguro

## Variables requeridas

En producción configura siempre:

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

El servidor rechaza el inicio en producción si falta `SUPABASE_SERVICE_ROLE_KEY`. La clave de servicio se utiliza solo en Express para ejecutar operaciones transaccionales y administrar usuarios; nunca debe aparecer en variables `VITE_*`, código cliente ni repositorio.

## Migraciones

Ejecuta las migraciones SQL en orden numérico antes del despliegue. Conserva una copia de seguridad de la base antes de aplicar migraciones de datos.

## Verificación previa

Ejecuta antes de desplegar:

```bash
npm test
npm run check
npm run build
```

Después de desplegar, verifica `GET /api/health`. El endpoint responde sin autenticación y no consulta ni expone datos de clientes.
