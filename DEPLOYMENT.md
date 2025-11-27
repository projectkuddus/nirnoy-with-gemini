# 🚀 Nirnoy Health App - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- [ ] Node.js 18+ installed
- [ ] Git configured
- [ ] Vercel account (free tier works)
- [ ] Supabase account (free tier works)
- [ ] Google AI Studio account (for Gemini API)
- [ ] Domain: www.nirnoy.ai (or your domain)

---

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and name: `nirnoy-production`
4. Select region: **Singapore** (closest to Bangladesh)
5. Create a strong database password (save it!)

### 1.2 Run Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy contents of `supabase/schema.sql`
3. Paste and click **Run**
4. Verify tables are created in **Table Editor**

### 1.3 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 1.4 Configure Auth
1. Go to **Authentication** → **Providers**
2. Enable **Phone** provider
3. Configure SMS provider (Twilio/MessageBird) for OTP

---

## Step 2: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key → `VITE_GEMINI_API_KEY`

---

## Step 3: Deploy to Vercel

### 3.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub: `projectkuddus/nirnoy-with-gemini`
4. Select the `complete-nirnoy-v1` branch

### 3.2 Configure Build Settings
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3.3 Add Environment Variables
In Vercel dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key |
| `VITE_SUPABASE_URL` | https://xxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_APP_ENV` | production |
| `VITE_APP_URL` | https://www.nirnoy.ai |

### 3.4 Deploy
Click "Deploy" and wait for build to complete.

---

## Step 4: Configure Domain

### 4.1 Add Domain in Vercel
1. Go to Project → **Settings** → **Domains**
2. Add domain: `nirnoy.ai`
3. Add domain: `www.nirnoy.ai`

### 4.2 Update DNS Records
In your domain registrar (e.g., Namecheap, GoDaddy):

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 4.3 Wait for SSL
Vercel automatically provisions SSL. Wait 5-10 minutes.

---

## Step 5: Post-Deployment Checklist

### Verify Everything Works
- [ ] Homepage loads at www.nirnoy.ai
- [ ] Doctor search works
- [ ] Booking flow completes
- [ ] AI chat responds
- [ ] Voice agent connects (requires HTTPS)
- [ ] Login/OTP works
- [ ] Feedback widget appears

### Monitor
1. **Vercel Analytics**: Enable in project settings
2. **Supabase Logs**: Check for errors
3. **Error Tracking**: Consider adding Sentry

---

## Environment Variables Reference

```env
# Required
VITE_GEMINI_API_KEY=AIza...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# App Config
VITE_APP_ENV=production
VITE_APP_URL=https://www.nirnoy.ai
VITE_APP_NAME=Nirnoy

# Feature Flags
VITE_ENABLE_VOICE_AGENT=true
VITE_ENABLE_AI_CHAT=true

# Optional - Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Optional - SMS (for production OTP)
VITE_SMS_API_KEY=xxx
VITE_SMS_SENDER_ID=NIRNOY
```

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Voice Agent Not Working
- Ensure HTTPS is enabled (required for microphone access)
- Check Gemini API key is valid
- Check browser console for errors

### Database Connection Issues
- Verify Supabase URL and key
- Check RLS policies allow access
- Verify tables exist

### Domain Not Working
- DNS propagation takes up to 48 hours
- Check DNS records are correct
- Verify SSL certificate is issued

---

## Support

- **Documentation**: [docs.nirnoy.ai](https://docs.nirnoy.ai)
- **Email**: tech@nirnoy.ai
- **GitHub Issues**: [github.com/projectkuddus/nirnoy-with-gemini/issues](https://github.com/projectkuddus/nirnoy-with-gemini/issues)

---

## Security Checklist

- [ ] Environment variables are NOT committed to Git
- [ ] Supabase RLS policies are enabled
- [ ] API keys have appropriate restrictions
- [ ] HTTPS is enforced
- [ ] CORS is configured properly
- [ ] Rate limiting is enabled (Vercel Edge)

---

**Last Updated**: November 2024
**Version**: 1.0.0

