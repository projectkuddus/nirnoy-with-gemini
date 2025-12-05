# 🚀 Local Development Guide

## Why Test Locally First?

✅ **Best Practice** - Testing on localhost before deploying is **HIGHLY RECOMMENDED**:

- 🐛 **Catch bugs early** - Fix issues before they reach production
- ⚡ **Faster feedback** - See changes instantly (hot reload)
- 🔒 **Safe experimentation** - Test without affecting live users
- 💰 **Save resources** - Don't waste Vercel build minutes on broken code
- 🎯 **Better quality** - More thorough testing = fewer production issues

---

## Quick Start

### 1. Install Dependencies
```bash
cd nirnoy-with-gemini
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory:

```bash
# Copy from env.example
cp env.example .env
```

Then edit `.env` with your local/test credentials:
```env
# Supabase (use your Supabase project)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Config
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173

# Optional - Analytics (won't track in dev)
VITE_GA_MEASUREMENT_ID=G-PSGSG6VE4S

# Optional - Sentry (won't send errors in dev)
VITE_SENTRY_DSN=
```

### 3. Start Development Server
```bash
npm run dev
```

This will:
- Start Vite dev server on `http://localhost:5173`
- Automatically open your browser
- Enable hot module replacement (changes appear instantly)
- Show helpful error messages in the console

### 4. Test Your Changes
- Make changes to any file
- See updates instantly in the browser
- Check console for errors
- Test all features before deploying

### 5. Build & Preview Production Build
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

This lets you test the production build locally before deploying.

---

## Recommended Workflow

### Daily Development:
1. **Start local server**: `npm run dev`
2. **Make changes** → See updates instantly
3. **Test thoroughly** on localhost
4. **Commit changes**: `git add . && git commit -m "description"`
5. **Push to GitHub**: `git push origin main`
6. **Vercel auto-deploys** (only after local testing passes)

### Before Major Features:
1. Test on localhost first
2. Build and preview: `npm run build && npm run preview`
3. Test production build locally
4. If everything works → push to GitHub

---

## What to Test Locally

✅ **Always test before deploying:**
- [ ] Page loads without errors
- [ ] Navigation works
- [ ] Forms submit correctly
- [ ] API calls succeed
- [ ] No console errors
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] All features work as expected

---

## Troubleshooting

### Port Already in Use?
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.ts
```

### Environment Variables Not Loading?
- Make sure `.env` file is in root directory
- Restart dev server after changing `.env`
- Variables must start with `VITE_` to be exposed

### Build Errors?
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## Benefits Summary

| Aspect | Localhost Testing | Deploy First |
|--------|------------------|--------------|
| **Speed** | ⚡ Instant feedback | 🐌 Wait for build |
| **Cost** | 💰 Free | 💸 Uses build minutes |
| **Safety** | 🔒 Safe to break | ⚠️ Affects users |
| **Debugging** | 🐛 Easy to debug | 😰 Harder to debug |
| **Quality** | ✅ Better code | ❌ More bugs |

---

## Pro Tips

1. **Keep dev server running** - Don't restart unless needed
2. **Use browser DevTools** - Check console, network, performance
3. **Test on multiple devices** - Use browser responsive mode
4. **Test edge cases** - Empty states, errors, slow network
5. **Preview production build** - `npm run preview` before deploying

---

## Next Steps

Once you're comfortable with local testing:
- Set up hot reload for faster development
- Add testing tools (Jest, React Testing Library)
- Set up pre-commit hooks to catch errors early
- Use environment-specific configs (dev/staging/prod)

---

**Remember**: Local testing is a best practice used by all professional developers. It saves time, money, and prevents embarrassing production bugs! 🎯

