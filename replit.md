# Replit Agent Configuration

## Overview

This is a full-stack inventory management system ("Licorería Manager") for a liquor store. The application provides comprehensive inventory tracking with features for managing products, categories, suppliers, and stock movements. Built with a React frontend and Express backend, it uses PostgreSQL for data persistence and follows a type-safe approach throughout the stack.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme (deep blue/gold color palette)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard analytics

The frontend is organized with:
- `/client/src/pages/` - Page components (Dashboard, Inventory, Categories, Suppliers, Movements)
- `/client/src/components/` - Reusable UI components and layout components
- `/client/src/hooks/` - Custom hooks for data fetching (use-products, use-categories, etc.)
- `/client/src/lib/` - Utilities and query client configuration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints defined in `/shared/routes.ts` with Zod schema validation
- **Authentication**: Prepared for Replit Auth integration (see `/server/replit_integrations/auth`)

The backend follows a layered architecture:
- `/server/routes.ts` - API route handlers
- `/server/storage.ts` - Data access layer with DatabaseStorage class
- `/server/db.ts` - Database connection pool configuration
- `/shared/schema.ts` - Drizzle table definitions and Zod schemas

### Shared Code
The `/shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database table definitions, relations, and TypeScript types
- `routes.ts` - API contract definitions with request/response schemas

### Data Model
Four core entities:
1. **Categories** - Product categorization (id, name, description)
2. **Suppliers** - Vendor information (id, name, contactInfo, address)
3. **Products** - Inventory items with pricing, stock levels, and relationships to categories/suppliers
4. **Movements** - Stock transactions (IN, OUT, ADJUSTMENT) for audit trail

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production**: esbuild bundles server code, Vite builds client to `/dist/public`
- **Database Migrations**: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM** - Type-safe database queries and schema management
- **connect-pg-simple** - PostgreSQL session store for Express sessions

### UI/Frontend Libraries
- **@radix-ui** - Accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **shadcn/ui** - Pre-built component library using Radix primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - React charting library for dashboard analytics
- **date-fns** - Date formatting utilities (with Spanish locale support)

### Backend Services
- Replit Auth integration scaffold exists but is not fully implemented
- No external API integrations currently active

### Development Tools
- **Vite** - Frontend build tool and dev server
- **esbuild** - Server bundling for production
- **TypeScript** - Type checking across the entire codebase