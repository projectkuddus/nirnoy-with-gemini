# Nirnoy - Production Deployment Guide

## 🚀 Getting Ready for www.nirnoy.ai

This document outlines the production setup for Nirnoy Health System.

## Prerequisites

- Supabase account
- Domain: www.nirnoy.ai
- SSL certificate
- Environment variables configured

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Run Database Migration**
   - Go to Supabase Dashboard > SQL Editor
   - Run `database/migrations/001_initial_schema.sql`

4. **Build for Production**
   ```bash
   npm run build
   ```

5. **Deploy**
   - Deploy `dist/` folder to your hosting (Vercel, Netlify, etc.)
   - Configure domain: www.nirnoy.ai

## Environment Variables

Required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_APP_URL`
- `VITE_DOMAIN`

## Database Setup

See `docs/SUPABASE_SETUP.md` for detailed instructions.

## Architecture

See `docs/ARCHITECTURE.md` for system architecture.

## Support

For production issues, check:
1. Supabase dashboard logs
2. Browser console errors
3. Network tab for API calls

