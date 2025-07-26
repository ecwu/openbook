# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Operations
```bash
pnpm db:push      # Push schema changes to database (development)
```

### Development Server
```bash
pnpm dev          # Start development server with Turbo
pnpm build        # Production build
```

### Code Quality
```bash
pnpm check        # Run Biome linting and formatting
```

### Database Setup
SQLite database file will be created automatically when first accessed.

## Architecture Overview

**OpenBook** is a resource booking and management system built with the T3 Stack, designed for managing shared computing resources (GPUs, servers, etc.) in academic or enterprise environments.

### Core Technology Stack
- **Next.js 15** with App Router and React 19
- **SQLite** with **Drizzle ORM** for database operations
- **tRPC 11** for type-safe API communication
- **NextAuth 5** with Authentik SSO provider for authentication
- **Tailwind CSS 4** with shadcn/ui components
- **Biome** for code formatting and linting

### Database Schema Design

The schema uses a multi-tenant approach with `openbook_` table prefixes and sophisticated relationships:

- **Users & Groups**: Many-to-many relationship with roles (member/manager)
- **Resources**: Flexible capacity management (divisible/indivisible resources)
- **Bookings**: Complex scheduling with shared/exclusive booking types
- **Access Control**: Group-based permissions (whitelist/blacklist model)
- **Resource Limits**: Multi-dimensional quotas (daily/weekly/monthly hours, concurrent bookings)

Key schema files:
- `src/server/db/schema.ts` - All database tables and relations
- `drizzle.config.ts` - Database connection and migration configuration

### Authentication & Authorization

Authentication is handled via **NextAuth** with enterprise SSO:
- **Authentik provider** for single sign-on
- **Role-based access** (admin/user roles)
- **Session extension** with custom user fields
- **Drizzle adapter** for database session storage

Configuration in:
- `src/server/auth/config.ts` - NextAuth configuration
- `src/server/auth/index.ts` - Auth utilities
- `src/env.js` - Environment variable validation

### tRPC API Structure

The API is organized into domain-specific routers under `src/server/api/routers/`:

- **users**: User management and group operations
- **groups**: Group CRUD and access control
- **resources**: Resource management with capacity tracking
- **bookings**: Complex booking system with calendar integration
- **limits**: Resource quota and limit management

Key architectural patterns:
- All procedures use proper authorization checks
- Complex validation with Zod schemas
- Booking conflict detection for overlapping reservations
- Calendar integration support (FullCalendar format)

### Frontend Architecture

- **App Router** structure in `src/app/`
- **Server and client components** separation
- **50+ shadcn/ui components** in `src/components/ui/`
- **Custom hooks** in `src/hooks/` for business logic
- **tRPC React Query integration** for data fetching

### Environment Configuration

Environment variables are validated via `src/env.js` using the T3 env pattern. Key variables include:
- Database connection (SQLite)
- NextAuth configuration (Authentik SSO)
- Application URLs and secrets

Check `.env.example` for required environment variables.

### Development Workflow

1. **Database changes**: Modify `src/server/db/schema.ts`, then run `pnpm db:push`
2. **API changes**: Add/modify tRPC routers in `src/server/api/routers/`
3. **UI changes**: Use existing shadcn/ui components or add new ones
4. **Code quality**: Run `pnpm check` before commits (Biome handles formatting/linting)

### Business Domain Context

This is a **computing resource management platform** focused on:
- Academic/research institutions with shared computing infrastructure
- Complex booking scenarios with capacity management
- Multi-tenant access via groups and permissions
- Admin approval workflows for resource requests
- Usage tracking and reporting capabilities

The codebase implements sophisticated domain logic for resource scheduling, capacity management, and access control that goes beyond simple calendar booking systems.