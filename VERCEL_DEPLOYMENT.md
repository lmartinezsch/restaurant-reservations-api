# Vercel Deployment Guide

This API can be deployed to Vercel as a serverless function.

## 📦 Prerequisites

- A [Vercel account](https://vercel.com)
- [Vercel CLI](https://vercel.com/cli) (optional)

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
- **Cold Starts**: First request may be slower (cold start), subsequent requests are faster
- **In-Memory Storage**: Data persists only during the function's lifetime (ephemeral)
- **State Management**: Each serverless invocation may get a fresh instance

## ⚠️ Important Notes

### Limitations in Serverless Environment

1. **Data Persistence**: In-memory repositories will reset between cold starts
2. **Locks**: Concurrency locks work within a single function instance only
3. **Idempotency Keys**: May not persist across different function instances

### Production Recommendations

For a production deployment on Vercel, consider:

1. **Database**: Replace in-memory repositories with a real database:

   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Supabase](https://supabase.com/)
   - [PlanetScale](https://planetscale.com/)
   - [MongoDB Atlas](https://www.mongodb.com/atlas)

2. **Distributed Locks**: Use Redis for distributed locking:

   - [Upstash Redis](https://upstash.com/) (Vercel-friendly)
   - [Redis Cloud](https://redis.com/cloud/)

3. **Idempotency**: Store keys in Redis with TTL

4. **Environment Variables**: Set in Vercel Dashboard:
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - Database connection strings

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
