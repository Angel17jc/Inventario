# Arquitectura

## Un solo despliegue

Vercel sirve el frontend compilado como estáticos y ejecuta la misma app Express como
función serverless en `/api/*`. No hay backend alojado aparte.

```
api/index.ts              Entrada serverless. Importa backend/app.js de forma diferida
backend/app.ts            createApp(), compartido por el servidor local y Vercel
backend/index.ts          SOLO servidor de desarrollo, con Vite. No se despliega
```

`npm run build` **es** `vite build`, el mismo comando que ejecuta Vercel. La API la
compila Vercel por su cuenta desde `api/index.ts`. No se empaqueta ningún servidor.

### Dos reglas que rompen el despliegue si se olvidan

- **ESM nativo.** Vercel ejecuta la función con el resolvedor de Node: todo import
  relativo necesita extensión `.js` y los alias de `tsconfig` **no se resuelven**. Un
  guard del CI falla si aparece uno sin extensión, porque el error solo se manifiesta
  en la función desplegada.
- **`VITE_*` se incrusta al compilar.** No se lee en tiempo de ejecución. Cambiar una
  de esas variables exige volver a compilar.

## Organización por módulo de negocio

No por tipo de archivo. Cada módulo agrupa lo suyo: su página, sus consultas, sus rutas
y sus esquemas.

```
backend/
  auth.ts                 Autenticación y contexto de organización
  authorization.ts        Guardas por rol
  db.ts                   Cliente Supabase con la clave secreta
  database.types.ts       GENERADO. No editar a mano (ver OPERACION.md)
  errors.ts               Traducción de errores a respuestas HTTP
  storage.ts              Acceso a datos, siempre acotado a una organización
  platform-service.ts     Alta de licorerías cliente y su propietario
  routes.ts               Ensamblador: salud, auth, contexto, y registra los módulos
  modules/                catalog · credits · inventory · organization · platform

frontend/src/
  App.tsx                 Rutas y guardas de sesión
  lib/                    Cliente Supabase, sesión, errores, borradores de formulario
  pages/                  Login, nueva contraseña, panel, 404
  modules/                catalog · credits · inventory · organization · platform
  components/ui/          Interfaz reutilizable, sin reglas de negocio
  components/layout/      Barra lateral
  hooks/                  Solo hooks de interfaz sin dominio, como use-toast

shared/                   schema.ts (Zod + Drizzle) · routes.ts · errors.ts · tenancy.ts
database/migrations/      Numeradas, se aplican en orden. Única descripción de la base
database/tests/           Comprobaciones sobre las funciones transaccionales
```

**Se importa siempre desde el módulo dueño.** Los adaptadores de compatibilidad que
hubo en `frontend/src/hooks` ya no existen.

`backend/routes.ts` es un ensamblador y no debe acumular reglas de negocio.
`frontend/src/components` y `frontend/src/lib` no deben contener reglas de inventario,
catálogo, fiados ni plataforma.

## Multiempresa

- `organizations` — una licorería cliente.
- `organization_memberships` — relaciona un usuario de Supabase Auth con una licorería
  y un rol local.
- Toda tabla de negocio lleva `organization_id` obligatorio.

El administrador de plataforma **tiene su propia licorería**, aprovisionada
automáticamente en su primer acceso: no tiene que crearla, y es una licorería como
cualquier otra.

Cada cliente tiene **un único usuario**, su propietario, creado en el mismo acto que la
licorería. Ver [SEGURIDAD.md](SEGURIDAD.md) para el modelo completo de roles y
aislamiento.

## El modelo de datos que más cuesta entender

### Presentaciones

Un producto se vende suelto **y** por caja, y las cajas varían: whisky de 6 y de 12,
cerveza de 10, 12 o 24. Por eso una caja no es una columna del producto sino una fila
propia.

- `products.unit_label` — cómo se llama la unidad ("botella").
- `products.cost_price` / `selling_price` — **por unidad**.
- `product_packs` — `label`, `units`, `cost` y `price`, los dos últimos **de la caja
  entera**, que es como vienen en la factura y en la percha. El costo por unidad se
  **deriva** (`cost / units`): un número que mantener en vez de dos que se contradicen.

### Una venta son cajas más sueltas

"2 cajas y 2 unidades" es **una** venta, no dos.

```
unidades = cajas × unidades_de_la_caja + sueltas
total    = cajas × precio_de_la_caja   + sueltas × precio_por_unidad
```

El stock se cuenta **siempre en unidades base**. `movements.entered_quantity` guarda las
cajas y `loose_quantity` las sueltas, para poder leer después lo que la persona tecleó.

La primera línea la calcula la función SQL con la fila del producto bloqueada. La
segunda vive en `shared/schema.ts` (`toBaseUnits`, `priceOf`, `unitCostOf`, `chargeFor`,
`describeSale`), con tests.

### El stock puede quedar negativo

Nunca se bloquea una venta. Si el tendero tiene la botella en la mano, la vende; el
registro lo dice después. Es una decisión de producto, no un descuido, y la migración
010 la hizo cumplir.

### Historial unificado

`GET /api/movimientos/historial` devuelve movimientos y abonos de fiado **intercalados
por instante**. Las tablas no se mezclan: un movimiento siempre tiene producto y un
abono nunca, así que se leen por separado y se combinan al responder.

Es el único endpoint acotado por diseño: 50 registros por defecto, 200 como máximo.

## Convenciones para cambios nuevos

- Crear primero el contrato y la validación de entrada, en `shared/`.
- Implementar las rutas del módulo con autorización explícita.
- Mantener las llamadas HTTP del frontend en el módulo dueño.
- Invalidar las consultas de TanStack Query afectadas después de una mutación.
- Devolver errores seguros: `shared/errors.ts` define los códigos, el mensaje es para
  leer y el código para reaccionar. `describeError()` es el único sitio del frontend que
  convierte un error en texto.
- Añadir pruebas de la regla antes de tocar una operación crítica.
- Commits pequeños, convencionales, en inglés, con el motivo del cambio.
