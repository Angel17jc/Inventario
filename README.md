# 📦 Inventory Dashboard

Sistema de gestión de inventario moderno y completo construido con React, TypeScript, Express y PostgreSQL.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Características

- 📊 **Dashboard Interactivo** - Visualización en tiempo real de estadísticas de inventario
- 📦 **Gestión de Productos** - CRUD completo de productos con categorías y proveedores
- 🏷️ **Categorías** - Organización de productos por categorías personalizadas
- 🏢 **Proveedores** - Gestión de información de proveedores
- 📈 **Movimientos** - Registro de entradas, salidas y ajustes de inventario
- 🔔 **Alertas de Stock Bajo** - Notificaciones cuando productos están por debajo del stock mínimo
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
- **Drizzle ORM** - ORM moderno para PostgreSQL
- **Zod** - Validación de esquemas
- **PostgreSQL** - Base de datos relacional

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 18+ instalado
- Una cuenta en [Supabase](https://supabase.com) (gratis) o PostgreSQL local

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd Inventory-Dashboard
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Base de Datos

#### **Opción A: Usar Supabase (Recomendado - Gratis)**

1. **Lee la guía completa de configuración:**
   ```bash
   # Abre el archivo SUPABASE_SETUP.md
   ```

2. **Resumen rápido:**
   - Crea una cuenta en [Supabase](https://supabase.com)
   - Crea un nuevo proyecto
   - Obtén tu `DATABASE_URL` desde Settings > Database
   - Ejecuta el SQL de `database/schema.sql` en el SQL Editor
   - (Opcional) Ejecuta `database/seed.sql` para datos de prueba

3. **Configura las variables de entorno:**
   ```bash
   # Copia el archivo de ejemplo
   cp .env.example .env
   
   # Edita .env y agrega tu DATABASE_URL de Supabase
   ```

#### **Opción B: PostgreSQL Local**

1. **Instala PostgreSQL** en tu sistema
2. **Crea una base de datos:**
   ```sql
   CREATE DATABASE inventory_db;
   ```
3. **Configura `.env`:**
   ```env
   DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/inventory_db
   ```
4. **Ejecuta las migraciones:**
   ```bash
   npm run db:push
   ```

### 4. Iniciar el Proyecto

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5000](http://localhost:5000)

## 📁 Estructura del Proyecto

```
Inventory-Dashboard/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── layout/    # Componentes de layout
│   │   │   ├── modals/    # Modales de diálogo
│   │   │   └── ui/        # Componentes UI de shadcn
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilidades y configuración
│   │   ├── pages/         # Páginas de la aplicación
│   │   └── main.tsx       # Punto de entrada
│   └── index.html
│
├── server/                # Backend Express
│   ├── db.ts             # Configuración de DB
│   ├── index.ts          # Servidor Express
│   ├── routes.ts         # Definición de rutas API
│   └── vite.ts           # Integración Vite
│
├── shared/               # Código compartido
│   ├── routes.ts        # Contrato de API
│   └── schema.ts        # Schemas Drizzle + Zod
│
├── database/            # Scripts SQL
│   ├── schema.sql      # Definición de tablas
│   └── seed.sql        # Datos de prueba
│
├── SUPABASE_SETUP.md   # Guía de configuración Supabase
└── package.json
```

## 📚 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo

# Build
npm run build        # Compila el proyecto para producción

# Producción
npm start            # Ejecuta el servidor en modo producción

# Verificación
npm run check        # Verifica tipos de TypeScript

# Base de Datos
npm run db:push      # Sincroniza schema con la base de datos
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
- `POST /api/movements` - Registrar un movimiento

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
- `.env` excluido del control de versiones
- Validación de datos con Zod en frontend y backend
- Manejo de errores robusto

## 📊 Modelo de Datos

### Categorías
- `id` - ID único
- `name` - Nombre de la categoría
- `description` - Descripción opcional

### Proveedores
- `id` - ID único
- `name` - Nombre del proveedor
- `contact_info` - Información de contacto
- `address` - Dirección

### Productos
- `id` - ID único
- `name` - Nombre del producto
- `description` - Descripción
- `sku` - Código único del producto
- `quantity` - Cantidad en stock
- `cost_price` - Precio de costo
- `selling_price` - Precio de venta
- `category_id` - Relación con categoría
- `supplier_id` - Relación con proveedor
- `min_stock_level` - Nivel mínimo de stock
- `image_url` - URL de imagen

### Movimientos
- `id` - ID único
- `product_id` - Relación con producto
- `type` - Tipo: IN, OUT, ADJUSTMENT
- `quantity` - Cantidad movida
- `reason` - Razón del movimiento
- `created_at` - Fecha y hora
- `user_id` - Usuario que realizó el movimiento

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

1. Revisa la [guía de configuración de Supabase](SUPABASE_SETUP.md)
2. Consulta la sección de Issues del repositorio
3. Verifica que todas las dependencias estén instaladas correctamente

## 🎯 Roadmap

- [ ] Autenticación de usuarios
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Sistema de roles y permisos
- [ ] Códigos de barras / QR
- [ ] Integración con APIs de proveedores
- [ ] Aplicación móvil nativa
- [ ] Modo multi-tienda
- [ ] Análisis predictivo de inventario

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) por los componentes UI
- [Radix UI](https://www.radix-ui.com/) por los primitivos accesibles
- [Tailwind CSS](https://tailwindcss.com/) por el framework CSS
- [Supabase](https://supabase.com/) por la infraestructura de base de datos

---

Hecho con ❤️ y ☕
