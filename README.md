# 📦 Licorería Manager - Sistema de Gestión de Inventario

Sistema de gestión de inventario moderno y completo para licorerías construido con React, TypeScript, Express y Supabase.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Características

- 📊 **Dashboard Interactivo** - Visualización en tiempo real de estadísticas de inventario
- 📦 **Gestión de Productos** - CRUD completo de productos con categorías y proveedores
- 🏷️ **Categorías** - Organización de productos por categorías personalizadas
- 🏢 **Proveedores** - Gestión de información de proveedores
- 📈 **Movimientos** - Registro de entradas, salidas y ajustes de inventario
- 💳 **Sistema de Fiados** - Gestión completa de cuentas de crédito para clientes
  - Registro de ventas fiadas con descuento automático de inventario
  - Seguimiento de pagos parciales y totales
  - Estadísticas de deudas por cliente
  - Historial de pagos
- 🔔 **Alertas de Stock Bajo** - Notificaciones cuando productos están por debajo del stock mínimo
- ✅ **Validación de Stock** - Prevención de ventas con stock insuficiente
- 📱 **Diseño Responsive** - Interfaz adaptable a dispositivos móviles y tablets
- 🎨 **UI Moderna** - Componentes UI de shadcn/ui con Tailwind CSS
- ⚡ **Rendimiento Optimizado** - React Query para manejo eficiente del estado

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **TanStack Query** - Gestión de estado del servidor
- **Wouter** - Enrutamiento ligero
- **shadcn/ui** - Componentes UI
- **Tailwind CSS** - Framework CSS utility-first
- **Recharts** - Gráficos y visualización de datos

### Backend
- **Express 5** - Framework web de Node.js
- **TypeScript** - Tipado estático
- **Supabase Client** - Cliente REST API para PostgreSQL
- **Zod** - Validación de esquemas
- **dotenv** - Gestión de variables de entorno

### Base de Datos
- **Supabase** - PostgreSQL como servicio (BaaS)
- **PostgreSQL** - Base de datos relacional

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 18+ instalado
- Una cuenta en [Supabase](https://supabase.com) (plan gratuito disponible)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Angel17jc/Inventario.git
cd Inventory-Dashboard
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. **Crea una cuenta en [Supabase](https://supabase.com)**

2. **Crea un nuevo proyecto** en el dashboard de Supabase

3. **Ejecuta los scripts SQL:**
   - Ve a SQL Editor en Supabase
   - Ejecuta `database/schema.sql` (estructura de tablas)
   - Ejecuta `database/credits.sql` (tablas de fiados)
   - (Opcional) Ejecuta `database/seed.sql` (datos de prueba)

4. **Obtén tus credenciales:**
   - Ve a Settings > API en tu proyecto
   - Copia la `URL` y el `anon public` key

5. **Configura las variables de entorno:**
   ```bash
   # Crea el archivo .env
   cp .env.example .env
   ```
   
   Edita `.env` y agrega:
   ```env
   SUPABASE_URL=tu_supabase_url
   SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

📚 **Para una guía detallada, consulta:**
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Configuración completa de Supabase
- [FIADOS_SETUP.md](FIADOS_SETUP.md) - Guía del sistema de fiados
- [SCHEMAS.md](SCHEMAS.md) - Documentación de la base de datos

### 4. Iniciar el Proyecto

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5000](http://localhost:5000)

## 📁 Estructura del Proyecto

```
Inventory-Dashboard/
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── layout/    # Componentes de layout (Sidebar)
│   │   │   ├── modals/    # Modales (ProductModal)
│   │   │   └── ui/        # Componentes UI de shadcn
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── use-categories.ts
│   │   │   ├── use-credits.ts
│   │   │   ├── use-movements.ts
│   │   │   ├── use-products.ts
│   │   │   └── use-suppliers.ts
│   │   ├── lib/           # Utilidades y configuración
│   │   ├── pages/         # Páginas de la aplicación
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inventory.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   ├── Movements.tsx
│   │   │   └── Credits.tsx
│   │   └── main.tsx       # Punto de entrada
│   └── index.html
│
├── backend/               # Backend Express
│   ├── db.ts             # Configuración de Supabase
│   ├── storage.ts        # Capa de acceso a datos
│   ├── index.ts          # Servidor Express
│   ├── routes.ts         # Definición de rutas API
│   └── vite.ts           # Integración Vite
│
├── shared/               # Código compartido
│   ├── routes.ts        # Contrato de API
│   └── schema.ts        # Schemas TypeScript + Zod
│
├── database/            # Scripts SQL para Supabase
│   ├── schema.sql      # Tablas principales
│   ├── credits.sql     # Sistema de fiados
│   └── seed.sql        # Datos de prueba
│
├── SUPABASE_SETUP.md   # Guía de configuración Supabase
├── FIADOS_SETUP.md     # Guía del sistema de fiados
├── SCHEMAS.md          # Documentación de esquemas
└── package.json
```

## 📚 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo en http://localhost:5000

# Build
npm run build        # Compila el proyecto para producción

# Producción
npm start            # Ejecuta el servidor en modo producción

# Verificación
npm run check        # Verifica tipos de TypeScript sin compilar
```

## 🔌 API Endpoints

### Categorías
- `GET /api/categories` - Listar todas las categorías
- `GET /api/categories/:id` - Obtener una categoría
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Proveedores
- `GET /api/suppliers` - Listar todos los proveedores
- `GET /api/suppliers/:id` - Obtener un proveedor
- `POST /api/suppliers` - Crear proveedor
- `PUT /api/suppliers/:id` - Actualizar proveedor
- `DELETE /api/suppliers/:id` - Eliminar proveedor

### Productos
- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener un producto
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Movimientos
- `GET /api/movements` - Listar todos los movimientos
- `POST /api/movements` - Registrar un movimiento (IN, OUT, ADJUSTMENT)

### Fiados (Créditos)
- `GET /api/credits` - Listar todas las cuentas de crédito
- `GET /api/credits/customer/:name` - Obtener cuentas por cliente
- `GET /api/credits/stats` - Estadísticas de fiados
- `POST /api/credits` - Crear nuevo fiado (descuenta inventario automáticamente)
- `POST /api/credits/payment` - Registrar un pago

### Estadísticas
- `GET /api/stats` - Obtener estadísticas del dashboard

## 🎨 Características de UI

- **Tema Oscuro** - Diseño moderno con paleta oscura
- **Animaciones Suaves** - Transiciones y efectos con Framer Motion
- **Componentes Accesibles** - Basados en Radix UI
- **Responsive Design** - Adaptable a todos los tamaños de pantalla
- **Toasts Notificaciones** - Feedback visual de acciones

## 🔐 Seguridad

- Variables de entorno para configuración sensible
- `.env` excluido del control de versiones con `.gitignore`
- Validación de datos con Zod en frontend y backend
- Manejo de errores robusto con try-catch
- Validación de stock antes de operaciones críticas
- Type-safe con TypeScript en todo el stack
- Constraints a nivel de base de datos (PostgreSQL)
- Supabase Row Level Security (RLS) disponible

## 📊 Modelo de Datos

### Categorías
- `id` - ID único (autoincremental)
- `name` - Nombre de la categoría
- `description` - Descripción opcional

### Proveedores
- `id` - ID único (autoincremental)
- `name` - Nombre del proveedor
- `contact_info` - Información de contacto
- `address` - Dirección

### Productos
- `id` - ID único (autoincremental)
- `name` - Nombre del producto
- `description` - Descripción
- `sku` - Código único del producto
- `quantity` - Cantidad en stock (con constraint >= 0)
- `cost_price` - Precio de costo
- `selling_price` - Precio de venta
- `category_id` - Relación con categoría (FK)
- `supplier_id` - Relación con proveedor (FK)
- `min_stock_level` - Nivel mínimo de stock (default: 5)
- `image_url` - URL de imagen

### Movimientos
- `id` - ID único (autoincremental)
- `product_id` - Relación con producto (FK)
- `type` - Tipo: `IN` (entrada), `OUT` (salida), `ADJUSTMENT` (ajuste)
- `quantity` - Cantidad movida
- `reason` - Razón del movimiento
- `created_at` - Fecha y hora (timestamp)
- `user_id` - Usuario que realizó el movimiento

### Cuentas de Crédito (Fiados)
- `id` - ID único (autoincremental)
- `customer_name` - Nombre del cliente
- `product_id` - Relación con producto (FK)
- `movement_id` - Relación con movimiento OUT (FK)
- `quantity` - Cantidad fiada
- `unit_price` - Precio unitario
- `total_amount` - Monto total (unitario × cantidad)
- `paid_amount` - Monto pagado (default: 0)
- `remaining_amount` - Deuda restante
- `status` - Estado: `pending`, `partial`, `paid`
- `notes` - Notas opcionales
- `created_at` - Fecha de creación
- `updated_at` - Última actualización (trigger automático)

### Pagos de Crédito
- `id` - ID único (autoincremental)
- `credit_account_id` - Relación con cuenta de crédito (FK)
- `amount` - Monto del pago
- `payment_method` - Método de pago (Efectivo, Transferencia, etc.)
- `notes` - Notas opcionales
- `created_at` - Fecha del pago

### Constraints y Validaciones
- ✅ Stock no puede ser negativo (`positive_quantity`)
- ✅ Montos de crédito deben ser positivos
- ✅ Pago no puede exceder deuda restante
- ✅ `total_amount = unit_price × quantity`
- ✅ Cascadas automáticas en eliminaciones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. **Documentación:**
   - [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Configuración de Supabase
   - [FIADOS_SETUP.md](FIADOS_SETUP.md) - Sistema de fiados
   - [SCHEMAS.md](SCHEMAS.md) - Esquemas de base de datos

2. **Issues:** Consulta la sección de [Issues](https://github.com/Angel17jc/Inventario/issues) del repositorio

3. **Verificaciones comunes:**
   - Todas las dependencias instaladas (`npm install`)
   - Variables de entorno configuradas en `.env`
   - Tablas creadas en Supabase (ejecutar SQLs)
   - Puerto 5000 disponible

## ⚙️ Configuración de Producción

Para desplegar en producción:

1. **Variables de entorno:**
   ```env
   NODE_ENV=production
   SUPABASE_URL=tu_url_produccion
   SUPABASE_ANON_KEY=tu_key_produccion
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Despliegue recomendado:**
   - **Frontend + Backend:** Vercel, Railway, Render
   - **Base de datos:** Supabase (ya incluido)
   - **Assets estáticos:** Cloudflare, Vercel Edge

## 🎯 Roadmap

### En Desarrollo
- [x] Sistema de fiados/créditos
- [x] Validación de stock en tiempo real
- [x] Migración a Supabase REST API

### Planificado
- [ ] Autenticación de usuarios con Supabase Auth
- [ ] Sistema de roles y permisos
- [ ] Reportes y analytics avanzados
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Códigos de barras / QR
- [ ] Notificaciones push
- [ ] Integración con APIs de proveedores
- [ ] Aplicación móvil nativa
- [ ] Modo multi-tienda
- [ ] Análisis predictivo de inventario
- [ ] Sincronización offline
- [ ] Dashboard personalizable

## 🙏 Agradecimientos

- [Supabase](https://supabase.com/) por la infraestructura de base de datos
- [shadcn/ui](https://ui.shadcn.com/) por los componentes UI
- [Radix UI](https://www.radix-ui.com/) por los primitivos accesibles
- [Tailwind CSS](https://tailwindcss.com/) por el framework CSS
- [TanStack Query](https://tanstack.com/query) por el manejo del estado
- [Vite](https://vitejs.dev/) por el tooling de desarrollo

---

Desarrollado con ❤️ y ☕ por [Angel17jc](https://github.com/Angel17jc)
