import { Page } from 'playwright';

export interface HighlightData {
  selector: string;  // CSS selector from scraper (e.g., "#question-123-456 .answer label:nth-child(2)")
  letter: string;    // "A", "B", "C", "D", or "UNKNOWN"
}

/**
 * Injects CSS styles and applies visual highlights to quiz answers on the page.
 * 
 * @param page - Playwright page instance
 * @param highlights - Array of highlight data with selectors and answer letters
 */
export async function applyHighlights(page: Page, highlights: HighlightData[]): Promise<void> {
  await page.evaluate((highlightsData) => {
    // Step 1: Inject CSS styles (only once per page)
    if (!document.getElementById('quiz-solver-styles')) {
      const style = document.createElement('style');
      style.id = 'quiz-solver-styles';
      style.textContent = `
        .quiz-solver-highlight {
          border: 3px solid #22c55e !important;
          background-color: rgba(34, 197, 94, 0.1) !important;
          position: relative;
          padding: 5px;
        }
        .quiz-solver-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #22c55e;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          z-index: 1000;
        }
        .quiz-solver-unknown {
          border: 3px solid #eab308 !important;
          background-color: rgba(234, 179, 8, 0.1) !important;
          position: relative;
          padding: 5px;
        }
        .quiz-solver-badge-unknown {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #eab308;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          z-index: 1000;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Step 2: Apply highlights to each selector
    highlightsData.forEach(({ selector, letter }) => {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`Quiz Solver: Selector not found - ${selector}`);
        return;
      }
      
      // Add appropriate class
      if (letter === 'UNKNOWN') {
        el.classList.add('quiz-solver-unknown');
      } else {
        el.classList.add('quiz-solver-highlight');
      }
      
      // Add badge
      const badge = document.createElement('span');
      badge.className = letter === 'UNKNOWN' ? 'quiz-solver-badge-unknown' : 'quiz-solver-badge';
      badge.textContent = `AI: ${letter}`;
      
      // Position badge (ensure element has relative positioning)
      (el as HTMLElement).style.position = 'relative';
      el.appendChild(badge);
    });
  }, highlights);
}
