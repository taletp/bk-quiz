const { chromium } = require('playwright');

(async () => {
  console.log('Testing Chromium launch...');
  console.time('launch');
  try {
    const browser = await chromium.launch({ headless: false });
    console.timeEnd('launch');
    console.log('✅ Browser launched successfully');
    await browser.close();
  } catch (error) {
    console.timeEnd('launch');
    console.log('❌ Error:', error.message);
  }
})();
