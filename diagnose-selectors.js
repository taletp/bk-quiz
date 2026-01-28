import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Diagnostic selector finder');
  console.log('================================');
  console.log('');
  console.log('1. Open your quiz in the browser');
  console.log('2. Log in if needed');
  console.log('3. Navigate to a quiz attempt page');
  console.log('4. Press Enter here when ready');
  console.log('');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Get the current URL from user
  console.log('\n📋 Enter quiz URL (paste and press Enter):');
  const url = await new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk.toString();
      if (data.includes('\n')) {
        process.stdin.removeAllListeners('data');
        resolve(data.trim());
      }
    });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('\n✅ Page loaded. Running analysis...\n');

  const analysis = await page.evaluate(() => {
    const result = {
      pageTitle: document.title,
      url: window.location.href,
      
      // Test various question container selectors
      selectors: {
        '.que.multichoice': document.querySelectorAll('.que.multichoice').length,
        '.que': document.querySelectorAll('.que').length,
        '[id^="question-"]': document.querySelectorAll('[id^="question-"]').length,
        '.question': document.querySelectorAll('.question').length,
        '.qtype_multichoice': document.querySelectorAll('.qtype_multichoice').length,
        '.qtext': document.querySelectorAll('.qtext').length,
      },

      // Sample first question container if exists
      firstQuestionContainer: (() => {
        const containers = [
          ...document.querySelectorAll('.que.multichoice'),
          ...document.querySelectorAll('.que'),
          ...document.querySelectorAll('[id^="question-"]'),
        ];
        if (containers.length === 0) return null;
        
        const first = containers[0];
        return {
          tag: first.tagName,
          id: first.id,
          classList: Array.from(first.classList),
          html: first.outerHTML.substring(0, 500) + '...',
          innerText: first.innerText?.substring(0, 200),
        };
      })(),

      // Find all unique question container patterns
      allContainers: (() => {
        const patterns = new Set();
        document.querySelectorAll('[id^="question-"], .que, .question, .qtype_multichoice').forEach(el => {
          const classes = Array.from(el.classList).join('.');
          patterns.add(`${el.tagName.toLowerCase()}#${el.id}.${classes}`);
        });
        return Array.from(patterns).slice(0, 5);
      })(),

      // Check for answer options
      answerPatterns: (() => {
        const labels = document.querySelectorAll('label');
        const radios = document.querySelectorAll('input[type="radio"]');
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        const answerDivs = document.querySelectorAll('.answer');
        
        if (labels.length > 0 && labels[0].parentElement) {
          return {
            'label elements': labels.length,
            'label parent tag': labels[0].parentElement.tagName,
            'label parent class': labels[0].parentElement.className,
            'radio inputs': radios.length,
            'checkbox inputs': checkboxes.length,
            'answer divs': answerDivs.length,
            'sample label HTML': labels[0].outerHTML.substring(0, 200),
          };
        }
        return null;
      })(),
    };
    
    return result;
  });

  console.log('📊 Analysis Results:');
  console.log('====================\n');
  console.log(JSON.stringify(analysis, null, 2));
  
  console.log('\n\n🎯 Recommendations:');
  console.log('=====================\n');
  
  if (analysis.selectors['.que.multichoice'] > 0) {
    console.log('✅ Current selector ".que.multichoice" WORKS - Found', analysis.selectors['.que.multichoice'], 'questions');
  } else {
    console.log('❌ Current selector ".que.multichoice" NOT FOUND');
    
    if (analysis.selectors['.que'] > 0) {
      console.log('   → Try changing to ".que" (found', analysis.selectors['.que'], 'containers)');
    }
    if (analysis.selectors['.qtype_multichoice'] > 0) {
      console.log('   → Try changing to ".qtype_multichoice" (found', analysis.selectors['.qtype_multichoice'], 'containers)');
    }
    if (analysis.selectors['[id^="question-"]'] > 0) {
      console.log('   → Questions by ID pattern found:', analysis.selectors['[id^="question-"]']);
    }
  }

  console.log('\n\n📋 First Question Container Details:');
  console.log('=====================================\n');
  if (analysis.firstQuestionContainer) {
    console.log(JSON.stringify(analysis.firstQuestionContainer, null, 2));
  } else {
    console.log('❌ No question containers found on this page');
  }

  console.log('\n✅ Browser still open. Inspect elements in DevTools if needed.');
  console.log('Press Ctrl+C to close.\n');
})();
