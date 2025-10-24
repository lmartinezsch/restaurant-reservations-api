# Vercel Deployment Guide

This API can be deployed to Vercel as a serverless function with **PostgreSQL database persistence**.

## 📦 Prerequisites

- A [Vercel account](https://vercel.com)
- [Vercel CLI](https://vercel.com/cli) (optional)
- **Vercel Postgres database** (or any PostgreSQL provider)

## 🗄️ Database Setup (Required)

### Step 1: Create Vercel Postgres Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" → "Create Database"
3. Select "Postgres"
4. Choose a name and region
5. Copy the connection string (will be used in environment variables)

Alternatively, use any PostgreSQL provider:

- Supabase
- PlanetScale (MySQL, requires schema changes)
- Railway
- Neon

### Step 2: Configure Environment Variables

In your Vercel project settings, add the following environment variable:

```
DATABASE_URL=postgres://username:password@host.postgres.vercel-storage.com:5432/verceldb
```

⚠️ **Important**: Add this to **all environments** (Production, Preview, Development)

### Step 3: Run Migrations

After deploying, migrations will run automatically via the `postinstall` script in `package.json`:

```json
"postinstall": "prisma generate"
```

For the first deployment, you may need to manually run migrations:

```bash
# From your local machine with DATABASE_URL set
npx prisma migrate deploy
```

Or use Vercel CLI:

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

## 🚀 Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Import your repository
5. Vercel will automatically detect the configuration from `vercel.json`
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## ⚙️ Configuration

The project includes a `vercel.json` file with the following configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

## 🔧 How It Works

- **Serverless Mode**: In Vercel, the Express app runs as a serverless function
- **Database**: PostgreSQL with Prisma ORM provides persistent storage
- **Auto-Seeding**: Database is automatically seeded on first run if empty
- **Connection Pooling**: Prisma manages connections efficiently for serverless
- **Cold Starts**: First request may be slower, subsequent requests are faster
- **State Management**: PrismaClient is instantiated as a singleton to reuse connections

## ✅ Production Ready

With Prisma PostgreSQL implementation, the API now has:

1. ✅ **Persistent Storage**: Data survives across deployments and cold starts
2. ✅ **Distributed Locks**: PostgreSQL row-level locks ensure concurrency safety across function instances
3. ✅ **Idempotency**: Keys stored in database with unique constraints
4. ✅ **ACID Transactions**: Database guarantees data consistency
5. ✅ **Automatic Timestamps**: `createdAt`/`updatedAt` managed at DB level

## ⚠️ Important Notes

### Environment Variables Required

Set these in Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
DATABASE_URL=postgres://...  # Your Postgres connection string
NODE_ENV=production          # Optional, recommended
LOG_LEVEL=info              # Optional, for Pino logging
```

## 🧪 Testing Deployed API

After deployment, Vercel will provide a URL like `https://your-app.vercel.app`

Test the endpoints:

```bash
# Check availability
curl "https://your-app.vercel.app/availability?restaurantId=R1&sectorId=S1&date=2025-09-08&partySize=4"

# Create reservation
curl -X POST https://your-app.vercel.app/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-1" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T20:00:00-03:00",
    "customer": {
      "name": "John Doe",
      "phone": "+54 11 1234-5678",
      "email": "john@example.com"
    }
  }'
```

## 📊 Monitoring

- **Logs**: View logs in Vercel Dashboard → Your Project → Logs
- **Analytics**: Enable Vercel Analytics for request metrics
- **Errors**: Errors are automatically logged in Vercel's error tracking

## 🔄 Continuous Deployment

Once connected to Git:

- Push to `main` branch → Automatic production deployment
- Push to other branches → Preview deployments
- Pull requests → Automatic preview URLs

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
