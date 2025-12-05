# 📸 How to Create OG Image for Social Media

## Problem
The `og-image.png` file is missing from the `public/` folder. Social media platforms need an actual PNG image file (not HTML) to display previews.

## Solution: Generate PNG from HTML

### Method 1: Using Browser DevTools (Easiest)

1. **Open the generator:**
   ```bash
   # Start dev server
   npm run dev
   
   # Navigate to: http://localhost:5173/og-image.html
   ```

2. **Capture screenshot:**
   - Right-click on the blue image box
   - Select "Inspect" (or press F12)
   - In DevTools, right-click on the `.og-image` element
   - Select "Capture node screenshot"
   - Save as `og-image.png` in the `public/` folder

3. **Verify:**
   - File should be: `public/og-image.png`
   - Size: 1200x630 pixels
   - Format: PNG

### Method 2: Using Online Tools

1. **Visit:** https://www.nirnoy.ai/og-image.html
2. **Use browser extension:**
   - Install "Full Page Screen Capture" or similar
   - Capture the image area
   - Crop to 1200x630
   - Save as PNG

### Method 3: Using Command Line (Puppeteer)

```bash
# Install puppeteer
npm install -D puppeteer

# Create script: scripts/generate-og-image.js
```

```javascript
// scripts/generate-og-image.js
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.goto('http://localhost:5173/og-image.html');
  await page.waitForSelector('.og-image');
  await page.screenshot({
    path: join(__dirname, '../public/og-image.png'),
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  await browser.close();
  console.log('✅ OG image created at public/og-image.png');
})();
```

Run:
```bash
npm run dev  # In one terminal
node scripts/generate-og-image.js  # In another terminal
```

## After Creating the Image

1. **Verify the file exists:**
   ```bash
   ls -la public/og-image.png
   ```

2. **Test the URL:**
   ```bash
   curl -I https://www.nirnoy.ai/og-image.png
   # Should return: HTTP/2 200
   ```

3. **Clear social media cache:**
   - **Facebook:** https://developers.facebook.com/tools/debug/
   - **Twitter:** https://cards-dev.twitter.com/validator
   - **LinkedIn:** https://www.linkedin.com/post-inspector/

4. **Test the preview:**
   - Share the link on Facebook/Twitter
   - Check if image appears
   - If not, wait 24 hours for cache to clear

## Image Requirements

- **Size:** 1200x630 pixels (recommended)
- **Format:** PNG or JPG
- **File size:** < 1MB (optimize if larger)
- **Location:** `public/og-image.png`
- **URL:** `https://www.nirnoy.ai/og-image.png`

## Quick Fix (If Image Still Not Showing)

1. **Check file exists:**
   ```bash
   curl https://www.nirnoy.ai/og-image.png
   ```

2. **Verify meta tags:**
   - Open: https://www.nirnoy.ai/
   - View page source
   - Search for "og:image"
   - Verify URL is correct

3. **Force refresh cache:**
   - Add `?v=2` to image URL: `og-image.png?v=2`
   - Update meta tag: `og:image.png?v=2`
   - Deploy and test again

## Current Status

✅ Meta tags configured correctly
✅ Image URL set: `https://www.nirnoy.ai/og-image.png`
❌ **Missing:** Actual PNG file in `public/` folder

**Next Step:** Generate the PNG image using Method 1 above.

