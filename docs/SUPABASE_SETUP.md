# Supabase Setup Guide for Nirnoy

This guide will help you set up Supabase for production deployment at www.nirnoy.ai

## Prerequisites

1. Supabase account (sign up at https://supabase.com)
2. Node.js 18+ installed
3. Git configured

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: nirnoy-production
   - **Database Password**: (generate strong password, save it!)
   - **Region**: Choose closest to Bangladesh (e.g., Southeast Asia)
   - **Pricing Plan**: Start with Free tier, upgrade as needed

## Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → (keep secret, for backend only)

## Step 3: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Open `database/migrations/001_initial_schema.sql`
3. Copy and paste the entire SQL into the editor
4. Click "Run" to execute
5. Verify tables are created in **Table Editor**

## Step 4: Configure Environment Variables

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-key-here
VITE_APP_ENV=production
VITE_APP_URL=https://www.nirnoy.ai
VITE_DOMAIN=www.nirnoy.ai
```

## Step 5: Enable Real-time

1. In Supabase dashboard, go to **Database** > **Replication**
2. Enable replication for:
   - `appointments`
   - `queue_entries`
   - `notifications`
   - `health_records`
   - `ai_conversations`

## Step 6: Set Up Row Level Security (RLS)

The migration script already includes RLS policies. Verify they're active:

1. Go to **Authentication** > **Policies**
2. Ensure all tables have appropriate policies

## Step 7: Configure Storage (Optional)

For profile images and documents:

1. Go to **Storage**
2. Create buckets:
   - `avatars` (public)
   - `prescriptions` (private)
   - `reports` (private)

## Step 8: Set Up Authentication

1. Go to **Authentication** > **Providers**
2. Enable:
   - **Phone** (for OTP)
   - **Email** (optional)

## Step 9: Configure Edge Functions (Optional)

For serverless functions:

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`

## Step 10: Test Connection

```typescript
import { supabase } from './lib/supabase';

// Test connection
const { data, error } = await supabase.from('users').select('count');
console.log('Connection:', error ? 'Failed' : 'Success');
```

## Production Checklist

- [ ] Database migration executed
- [ ] Environment variables configured
- [ ] RLS policies verified
- [ ] Real-time enabled for required tables
- [ ] Storage buckets created
- [ ] Authentication providers configured
- [ ] API keys secured (never commit to git)
- [ ] Backup strategy configured
- [ ] Monitoring set up
- [ ] Domain configured (www.nirnoy.ai)

## Scaling Considerations

### Database
- Monitor connection pool usage
- Set up read replicas for high read load
- Use connection pooling (PgBouncer)

### Storage
- Enable CDN for static assets
- Set up automatic backups

### Real-time
- Monitor channel usage
- Set up rate limiting
- Use presence channels for queue management

## Support

For issues:
1. Check Supabase logs in dashboard
2. Review RLS policies
3. Verify API keys
4. Check network connectivity

