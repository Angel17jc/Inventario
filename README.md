# Licorería Manager

Inventario y fiados para licorerías. Multiempresa, desplegado como una sola aplicación
en Vercel.

Cada licorería ve únicamente sus propios datos. Un administrador de plataforma da de alta
a los clientes con su propietario, sin acceder a lo que cada uno guarda.

---

## Qué hace

- **Inventario** — productos con costo, precio de venta, unidad, categoría y proveedor.
  Un producto se **retira**, no se borra: su historial de ventas sigue en pie.
- **Presentaciones** — un producto se vende suelto y por caja, y las cajas varían: de 6,
  de 12, de 24. Cada una guarda **su costo y su precio**, los de la caja entera; el costo
  por unidad se deriva.
- **Ventas** — una venta puede ser cajas más unidades sueltas a la vez: *2 cajas y 2
  cervezas* es un solo registro. La app calcula lo que sale del stock y lo que se cobra
  antes de guardarlo.
- **Fiados** — cuentas de crédito por cliente, vendidas igual que una venta al contado.
  Cada abono descuenta del saldo y la cuenta pasa a `partial` o `paid` sola.
- **Historial** — todo lo que entra y sale en una sola línea de tiempo, **incluidos los
  abonos de fiado**.
- **Catálogo** — categorías y proveedores, propios de cada licorería.
- **Panel** — total de productos, valor del inventario, productos agotados y actividad de
  los últimos siete días.
- **Mi licorería** — cambiar el nombre y subir el logo.
- **Clientes** — alta y suspensión de licorerías cliente. Reservado al administrador de
  plataforma, que no ve los datos de ninguna.

### Dos cosas que sorprenden y son a propósito

**El stock puede quedar negativo.** Nunca se bloquea una venta: si el tendero tiene la
botella en la mano, la vende. La app avisa después de que el producto quedó agotado, en
vez de impedirlo antes.

**Las compras no son un movimiento.** Lo que entra se anota corrigiendo el stock del
producto en Inventario. La pantalla de movimientos registra salidas.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS 3, wouter, TanStack Query |
| Componentes | shadcn/ui sobre Radix, lucide-react, Recharts |
| Backend | Express 5 sobre Node, desplegado como función serverless |
| Datos | Supabase (PostgreSQL) con Row Level Security |
| Autenticación | Supabase Auth (JWT), validado en el servidor |
| Validación | Zod, con esquemas compartidos entre cliente y servidor |
| Despliegue | Vercel — estáticos y API en el mismo proyecto |
| CI/CD | GitHub Actions |

---

## Empezar

```bash
npm install
cp .env.example .env      # y rellena los valores
npm run dev               # http://localhost:5000
```

Falta aplicar las migraciones y configurar Supabase: está en
**[OPERACION.md](OPERACION.md)**.

### Scripts

```bash
npm run dev       # Servidor de desarrollo con Vite, puerto 5000
npm run build     # Compila el frontend a dist/public
npm run check     # Comprueba tipos
npm test          # Ejecuta los tests
npm run types:db  # Regenera backend/database.types.ts desde la base
```

---

## Documentación

| Archivo | Contenido |
|---|---|
| **[ARQUITECTURA.md](ARQUITECTURA.md)** | Cómo está organizado, el modelo de datos y las convenciones para cambios nuevos |
| **[SEGURIDAD.md](SEGURIDAD.md)** | Claves, aislamiento entre licorerías, roles y autenticación |
| **[OPERACION.md](OPERACION.md)** | Puesta en marcha, migraciones, CI, despliegue y pruebas |

Son tres y no se solapan: cada tema se describe **en un solo sitio**. Si dos documentos
se contradicen, es un fallo que hay que arreglar, no una diferencia de matiz.

---

## API

Todo bajo `/api` exige `Authorization: Bearer <token>` salvo `/api/health`. Las rutas que
operan sobre datos de una licorería exigen además la cabecera `X-Organization-Id`.

| Método | Ruta | Quién |
|---|---|---|
| GET | `/api/health` | público |
| GET | `/api/health/database` | autenticado |
| GET | `/api/organizations/me` | autenticado |
| POST | `/api/account/password` | autenticado |
| GET | `/api/products`, `/api/products/:id` | miembro |
| POST, PUT, DELETE | `/api/products`, `/api/products/:id` | encargado |
| GET, POST | `/api/products/:id/presentaciones` | miembro / encargado |
| DELETE | `/api/presentaciones/:packId` | encargado |
| POST | `/api/movements` | cajero |
| GET | `/api/movimientos/historial` | miembro |
| GET | `/api/categories`, `/api/suppliers` (y `/:id`) | miembro |
| POST, PUT, DELETE | `/api/categories`, `/api/suppliers` | encargado |
| GET | `/api/credits`, `/api/credits/stats`, `/api/credits/customer/:nombre` | miembro |
| POST | `/api/credits`, `/api/credits/payment` | cajero |
| GET | `/api/stats` | miembro |
| PATCH | `/api/organization` | propietario |
| PUT, DELETE | `/api/organization/logo` | propietario |
| GET, POST | `/api/platform/organizations` | administrador de plataforma |
| PATCH | `/api/platform/organizations/:id/status` | administrador de plataforma |

`/api/movimientos/historial` está acotado a propósito: 50 registros por defecto, 200 como
máximo. No existe un endpoint que devuelva el historial entero.

---

## Licencia

MIT
