# Database Setup Guide

## Overview

This application now uses **PostgreSQL** with **Prisma ORM** for database persistence.

## Database Features

✅ **Automatic timestamp management** at database level (`createdAt`, `updatedAt`)  
✅ **Proper indexes** on foreign keys and query fields for performance  
✅ **Cascade deletes** for referential integrity  
✅ **Type-safe queries** with Prisma Client  
✅ **Migration system** for version control of schema changes

## Prerequisites

You need a PostgreSQL database. Options:

1. **Vercel Postgres** (Recommended for deployment)
2. **Local PostgreSQL** (For development)
3. **Prisma Postgres** (Cloud development database)

## Setup Instructions

### 1. Configure Database URL

Update your `.env` file with the connection string from your database provider:

```bash
# For Vercel Postgres
DATABASE_URL="postgres://username:password@host.vercel-storage.com:5432/verceldb?sslmode=require"

# For local PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_reservations?schema=public"
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

This creates the TypeScript types and client based on your schema.

### 3. Run Migrations

```bash
npx prisma migrate dev --name init
```

This will:

- Create the database schema
- Apply all migrations
- Generate Prisma Client

### 4. Seed Database (Optional)

The application automatically seeds the database with test data on first run if it's empty. To manually seed:

```bash
npm run dev
```

The seed data includes:

- 1 Restaurant (Buenos Aires timezone, 2 shifts)
- 2 Sectors (Main Hall, Terrace)
- 10 Tables (various capacities)

## Database Schema

### Models

#### Restaurant

- `id` (UUID, PK)
- `name` (String)
- `timezone` (String)
- `shifts` (JSON array)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### Sector

- `id` (UUID, PK)
- `restaurantId` (UUID, FK → Restaurant)
- `name` (String)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### Table

- `id` (UUID, PK)
- `sectorId` (UUID, FK → Sector)
- `name` (String)
- `minSize` (Int)
- `maxSize` (Int)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### Reservation

- `id` (UUID, PK)
- `restaurantId` (UUID, FK → Restaurant)
- `sectorId` (UUID, FK → Sector)
- `partySize` (Int)
- `startDateTimeISO` (String, indexed)
- `endDateTimeISO` (String, indexed)
- `status` (String: CONFIRMED, PENDING, CANCELLED)
- `customerName` (String, denormalized)
- `customerEmail` (String, denormalized)
- `customerPhone` (String, denormalized)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

#### ReservationTable (Junction Table)

- `id` (UUID, PK)
- `reservationId` (UUID, FK → Reservation)
- `tableId` (UUID, FK → Table)
- `createdAt` (Timestamp)

#### IdempotencyKey

- `id` (UUID, PK)
- `key` (String, unique, indexed)
- `reservationId` (String, indexed)
- `createdAt` (Timestamp)

#### Lock

- `id` (UUID, PK)
- `lockKey` (String, unique, indexed)
- `acquiredAt` (Timestamp)
- `expiresAt` (Timestamp, indexed)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

## Prisma Commands

### Development

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (visual database browser)
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Production (Vercel)

Set your `DATABASE_URL` as an environment variable in Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `DATABASE_URL` with your Postgres connection string
4. Redeploy

Migrations will run automatically during build via the postinstall script in `package.json`.

## Architecture Notes

### Repository Pattern

The application uses the repository pattern with Prisma implementations:

- `PrismaRestaurantRepository`
- `PrismaSectorRepository`
- `PrismaTableRepository`
- `PrismaReservationRepository`
- `PrismaIdempotencyKeyRepository`
- `PrismaLockRepository`

### Type Conversions

Prisma uses `Date` objects for timestamps, but the domain layer uses ISO string format. Each repository includes `toDomain()` methods for conversion:

```typescript
// Prisma DateTime → Domain ISO string
createdAt: prismaEntity.createdAt.toISOString();

// Domain ISO string → Prisma Date
createdAt: new Date(domainEntity.createdAt);
```

### Customer Data Denormalization

Customer data (name, email, phone) is stored directly in the `Reservation` table for query performance, avoiding joins. The domain `Customer` object is reconstructed in the `toDomain()` method.

### Reservation-Table Many-to-Many

The `ReservationTable` junction table enables:

- A reservation to occupy multiple tables
- Efficient queries for table availability
- Cascade deletion when reservations are cancelled

## Troubleshooting

### Error: "Can't reach database server"

- Verify your `DATABASE_URL` is correct
- Check if PostgreSQL is running (local development)
- Verify network connectivity (cloud databases)

### Error: "Environment variable not loaded"

- Ensure `.env` file exists in project root
- Check `dotenv/config` is imported in `prisma.config.ts`

### Migrations out of sync

```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

### Reset everything

```bash
npx prisma migrate reset
npx prisma generate
npm run dev
```
