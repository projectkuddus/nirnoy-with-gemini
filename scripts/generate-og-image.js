import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const outputPath = join(rootDir, 'public', 'og-image.png');

console.log('🎨 Generating OG Image...');
console.log('📁 Output:', outputPath);

(async () => {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to exact OG image size
    await page.setViewport({ 
      width: 1200, 
      height: 630,
      deviceScaleFactor: 1
    });
    
    // Navigate to the OG image HTML page
    const htmlPath = `file://${join(rootDir, 'public', 'og-image.html')}`;
    console.log('📄 Loading:', htmlPath);
    
    await page.goto(htmlPath, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for fonts and content to load
    await page.waitForSelector('.og-image', { timeout: 10000 });
    // Extra time for fonts to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot of the .og-image element
    const ogImageElement = await page.$('.og-image');
    
    if (!ogImageElement) {
      throw new Error('Could not find .og-image element');
    }
    
    await ogImageElement.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false
    });
    
    console.log('✅ OG image created successfully!');
    console.log('📸 File saved to:', outputPath);
    
    // Verify file exists
    if (existsSync(outputPath)) {
      const fs = await import('fs');
      const stats = fs.statSync(outputPath);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
  } catch (error) {
    console.error('❌ Error generating OG image:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

