# Deployment Guide for www.nirnoy.ai

## Quick Deploy Options

### Option 1: Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Configure domain: `vercel domains add www.nirnoy.ai`

### Option 2: Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Login: `netlify login`
3. Deploy: `netlify deploy --prod`
4. Configure domain in Netlify dashboard

### Option 3: Docker

1. Build: `docker build -f deploy/Dockerfile -t nirnoy-web .`
2. Run: `docker-compose -f deploy/docker-compose.yml up -d`
3. Configure nginx reverse proxy for domain

### Option 4: Manual Server

1. Build: `npm run build`
2. Upload `dist/` folder to server
3. Configure nginx (see `deploy/nginx.conf`)
4. Point domain to server IP

## Environment Variables

Set these in your hosting platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_APP_URL=https://www.nirnoy.ai`
- `VITE_DOMAIN=www.nirnoy.ai`

## Post-Deployment

1. Verify Supabase connection
2. Test real-time features
3. Monitor error logs
4. Set up SSL certificate
5. Configure CDN (optional)

