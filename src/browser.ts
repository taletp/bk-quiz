import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import { waitForEnter, printSuccess } from './utils.js';

// Global browser reference for SIGINT handler
let browserRef: Browser | null = null;

// Setup SIGINT handler for graceful cleanup
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupted.');
  if (browserRef) {
    await browserRef.close().catch(() => {});
  }
  process.exit(0);
});

// Debug logging helper
const isDebug = process.env.DEBUG?.includes('pw:browser') || process.env.DEBUG?.includes('pw:*');
function debugLog(...args: unknown[]) {
  if (isDebug) {
    console.log('[DEBUG]', ...args);
  }
}

// Check if running on Windows
const isWindows = process.platform === 'win32';
const isBunOnWindows = isWindows && typeof process.versions.bun !== 'undefined';

// Diagnostic: Test if system can spawn browser processes
async function runDiagnostics(): Promise<void> {
  if (!isWindows) return;
  
  console.log('🔍 Running Windows diagnostics...');
  
  // Check Windows version
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Windows version: ${process.env.OS || 'Unknown'}`);
  console.log(`  Node.js version: ${process.version}`);
  
  // Check if we can spawn processes
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Test basic command execution
    try {
      await execAsync('echo test');
      console.log('  ✓ Process spawning works');
    } catch {
      console.log('  ✗ Cannot spawn processes - permission issue?');
    }
    
    // Check for browser processes
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe" 2>nul');
      if (stdout.includes('chrome.exe')) {
        console.log('  ⚠️ Chrome is already running (may cause conflicts)');
      }
    } catch {
      // No chrome running
    }
    
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq msedge.exe" 2>nul');
      if (stdout.includes('msedge.exe')) {
        console.log('  ⚠️ Edge is already running (may cause conflicts)');
      }
    } catch {
      // No edge running
    }
    
    // Check Windows Defender status
    try {
      const { stdout } = await execAsync('powershell -Command "Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled" 2>nul');
      if (stdout.includes('True')) {
        console.log('  ℹ️ Windows Defender Real-time Protection is ON');
        console.log('     This may block browser automation');
      }
    } catch {
      // Can't check Defender status
    }
    
  } catch (error) {
    debugLog('Diagnostic error:', error);
  }
  
  console.log('');
}

// CDP websocket fallback for Windows (alternative connection method)
async function tryCdpWebsocketFallback(): Promise<{ browser: Browser; page: Page } | null> {
  if (!isWindows) return null;
  
  console.log('🔍 Trying CDP websocket fallback...');
  
  // Try to find Chrome/Edge executable
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];
  
  for (const exePath of possiblePaths) {
    let browserProcess: import('child_process').ChildProcess | null = null;
    try {
      debugLog('Checking for browser at:', exePath);
      const fs = await import('fs');
      if (!fs.existsSync(exePath)) {
        debugLog('Browser not found at:', exePath);
        continue;
      }
      
      console.log(`  Found browser at: ${exePath}`);
      console.log('  Launching with CDP websocket transport...');
      
      // Launch browser with remote debugging port
      const { spawn } = await import('child_process');
      const port = 9222 + Math.floor(Math.random() * 1000); // Random port to avoid conflicts
      
      // Create a temporary user data dir for Chrome 136+ compatibility
      const os = await import('os');
      const path = await import('path');
      const userDataDir = path.join(os.tmpdir(), `bk-quiz-chrome-profile-${Date.now()}`);
      
      browserProcess = spawn(exePath, [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`, // Required for Chrome 136+
        '--remote-debugging-address=127.0.0.1', // Force IPv4
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--enable-logging',
        '--v=1',
        'about:blank',
      ], {
        detached: false,
        windowsHide: false, // Show the browser window so we can see if it opens
      });
      
      // Monitor process errors
      browserProcess.on('error', (err) => {
        debugLog('Browser process error:', err.message);
      });
      
      browserProcess.on('exit', (code) => {
        debugLog('Browser process exited with code:', code);
      });
      
      console.log(`  Waiting for browser to start on port ${port}...`);
      
      // Wait for browser to start with progressive backoff
      let connected = false;
      const maxAttempts = 10;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if process is still running
        if (browserProcess.exitCode !== null) {
          console.log(`  ⚠️  Browser process exited early with code ${browserProcess.exitCode}`);
          break;
        }
        
        // Try to connect to CDP
        try {
          debugLog(`Connection attempt ${attempt}/${maxAttempts} to port ${port}...`);
          
          // First verify the port is responding (use 127.0.0.1 not localhost to avoid IPv6 issues)
          const http = await import('http');
          const versionResponse = await new Promise<string>((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.setTimeout(2000, () => {
              req.destroy();
              reject(new Error('Timeout'));
            });
          });
          
          debugLog('CDP version info:', versionResponse.substring(0, 200));
          console.log(`  ✓ Browser responding on port ${port}`);
          
          // Now connect via Playwright (use 127.0.0.1 to avoid IPv6 issues)
          const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
          
          console.log('  ✓ Connected via CDP websocket!');
          
          const page = browser.pages()[0] || await browser.newPage();
          
          // Store reference for cleanup
          browserRef = browser;
          
          // Handle cleanup
          process.on('exit', () => {
            browserProcess?.kill();
          });
          
          return { browser, page };
        } catch (err) {
          debugLog(`Attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
          if (attempt === maxAttempts) {
            console.log(`  ✗ Could not connect after ${maxAttempts} attempts`);
          }
        }
      }
      
      // Cleanup failed process
      if (browserProcess && browserProcess.exitCode === null) {
        browserProcess.kill();
      }
      
    } catch (error) {
      console.log(`  ✗ CDP fallback failed for ${exePath}:`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`    Error: ${errorMessage}`);
      
      // Check for specific error patterns
      if (errorMessage.includes('ECONNREFUSED')) {
        console.log('    → Connection refused. Browser may have crashed or port is blocked.');
      } else if (errorMessage.includes('Timeout')) {
        console.log('    → Connection timeout. Browser may be slow to start or blocked by policy.');
      } else if (errorMessage.includes('disallowed by the system admin')) {
        console.log('    → Remote debugging blocked by group policy!');
        console.log('      Check: chrome://policy (look for RemoteDebuggingAllowed)');
      }
      
      // Cleanup on error
      if (browserProcess && browserProcess.exitCode === null) {
        browserProcess.kill();
      }
    }
  }
  
  console.log('  ✗ CDP websocket fallback also failed');
  console.log('');
  console.log('  Possible causes:');
  console.log('  - Chrome 136+ requires user-data-dir (should be fixed now)');
  console.log('  - Group Policy blocking RemoteDebuggingAllowed');
  console.log('  - Windows Defender or antivirus blocking localhost connections');
  console.log('  - Windows Firewall blocking ports 9222+');
  console.log('  - Insufficient permissions (try running as Administrator)');
  console.log('');
  console.log('  Quick checks:');
  console.log('    1. Open Chrome and go to: chrome://policy');
  console.log('    2. Look for "RemoteDebuggingAllowed" - if false, CDP is blocked');
  console.log('    3. Try running as Administrator');
  console.log('');
  console.log('  Try running with DEBUG flag for more details:');
  console.log('    $env:DEBUG="pw:browser"');
  console.log('    npm run start');

  return null;
}

/**
 * Launches a visible browser, prioritizing Edge on Windows for reliability
 * Falls back through: Chromium → Firefox → WebKit
 * Navigates to HCMUT LMS login page and waits for user to complete login
 *
 * @returns Object with browser and page instances for use in other modules
 */
// Common args for Windows to improve compatibility
const windowsChromiumArgs = [
  '--disable-web-resources',
  '--disable-component-update',
  '--disable-component-extensions-with-background-pages',
  '--disable-gpu',                              // Disable GPU acceleration (helps on some Windows systems)
  '--disable-dev-shm-usage',                    // Avoid /dev/shm issues
  '--no-sandbox',                               // Disable sandbox (helps with antivirus/firewall)
  '--disable-setuid-sandbox',                   // Disable setuid sandbox
  '--disable-blink-features=AutomationControlled', // Hide automation flags
  '--disable-features=IsolateOrigins,site-per-process', // Disable site isolation
];

const windowsEdgeArgs = [
  '--disable-web-resources',
  '--disable-component-update',
  '--disable-component-extensions-with-background-pages',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
];

export async function launchBrowser(): Promise<{ browser: Browser; page: Page }> {
  // Run diagnostics first on Windows to help troubleshoot
  if (isWindows) {
    await runDiagnostics();
  }
  
  // For Bun on Windows, try CDP websocket fallback first
  if (isBunOnWindows) {
    const cdpResult = await tryCdpWebsocketFallback();
    if (cdpResult) {
      const { browser, page } = cdpResult;
      
      try {
        await page.goto('https://lms.hcmut.edu.vn/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        printSuccess('Browser opened at LMS homepage (CDP websocket mode)');
        console.log('👉 Please login manually, then press Enter when done.');
        await waitForEnter('');

        return { browser, page };
      } catch (error) {
        console.warn('⚠️ CDP browser navigation failed:', error instanceof Error ? error.message : error);
        await browser.close().catch(() => {});
      }
    }
  }

  const browserAttempts: Array<{
    name: string;
    launcher: () => Promise<Browser>;
  }> = [];

  // On Windows, try Edge first (most reliable on Windows), then Chromium, then Firefox
  if (isWindows) {
    browserAttempts.push(
      {
        name: 'Edge',
        launcher: () => {
          debugLog('Attempting to launch Edge with channel: msedge');
          return chromium.launch({
            channel: 'msedge',
            headless: false,
            timeout: 90000,  // Increased to 90s for slower Windows systems
            args: windowsEdgeArgs,
          });
        },
      },
      {
        name: 'Chromium (system)',
        launcher: () => {
          debugLog('Attempting to launch system Chromium');
          return chromium.launch({
            headless: false,
            timeout: 90000,
            args: [...windowsChromiumArgs, '--single-process=false'],
          });
        },
      },
      {
        name: 'Chromium (bundled)',
        launcher: () => {
          debugLog('Attempting to launch bundled Chromium');
          return chromium.launch({
            headless: false,
            timeout: 90000,
            args: windowsChromiumArgs,
          });
        },
      },
      {
        name: 'Firefox',
        launcher: () => {
          debugLog('Attempting to launch Firefox');
          return firefox.launch({
            headless: false,
            timeout: 90000,
          });
        },
      }
    );
  } else {
    // On macOS/Linux, try Chromium first
    browserAttempts.push(
      {
        name: 'Chromium',
        launcher: () =>
          chromium.launch({
            headless: false,
            timeout: 60000,
          }),
      },
      {
        name: 'Firefox',
        launcher: () =>
          firefox.launch({
            headless: false,
            timeout: 60000,
          }),
      }
    );
  }

  let lastError: Error | null = null;

  // Try each browser in order
  for (const { name, launcher } of browserAttempts) {
    try {
      console.log(`🔍 Attempting to launch ${name}...`);
      
      // Use consistent timeout that matches the launch timeout (90s for Windows, 60s otherwise)
      const launchTimeout = isWindows ? 95000 : 65000;
      
      const browser = await Promise.race([
        launcher(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${name} launch timeout after ${Math.round(launchTimeout / 1000)}s`)),
            launchTimeout
          )
        ),
      ]);

      browserRef = browser;
      debugLog(`${name} launched successfully`);
      const page = await browser.newPage();
      
      // Ensure window is visible - set explicit size and maximize
      await page.setViewportSize({ width: 1280, height: 800 });
      
      // Try to maximize/focus window (Playwright limitation, but helps on some systems)
      await page.evaluate(() => {
        window.resizeTo(1280, 800);
        window.moveTo(0, 0);
      }).catch(() => {
        // Ignore if window operations fail (browser may restrict them)
      });
      
      await page.goto('https://lms.hcmut.edu.vn/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      printSuccess(`Browser opened at LMS homepage (${name})`);
      console.log('👉 Please login manually, then press Enter when done.');
      await waitForEnter('');

      return { browser, page };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Browser launch failed');
      console.warn(`⚠️ ${name} launch failed: ${lastError.message}`);
    }
  }

  // All browsers failed
  console.error(
    `❌ Failed to launch any browser. Last error: ${lastError?.message || 'Unknown'}`
  );
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('');
  
  if (isWindows) {
    console.error('Windows-specific fixes (try in order):');
    console.error('');
    console.error('  1. Install/Update Edge Browser:');
    console.error('     Download from: https://www.microsoft.com/en-us/edge');
    console.error('     This tool prefers Edge on Windows for reliability');
    console.error('');
    console.error('  2. Reinstall Playwright browsers:');
    console.error('     npm run install:browsers');
    console.error('     # or: npx playwright install chromium firefox');
    console.error('');
    console.error('  3. Kill existing browser processes:');
    console.error('     Open Task Manager (Ctrl+Shift+Esc)');
    console.error('     Find and end: chrome.exe, msedge.exe, firefox.exe');
    console.error('');
    console.error('  4. Extend launch timeout via environment:');
    console.error('     $env:PLAYWRIGHT_LAUNCH_TIMEOUT=90000');
    console.error('     npm run start');
    console.error('');
    console.error('  5. Try running as Administrator:');
    console.error('     Right-click PowerShell → Run as Administrator');
    console.error('     cd path/to/bk-quiz');
    console.error('     npm run start');
    console.error('');
    console.error('  6. Check antivirus/firewall:');
    console.error('     Temporarily disable antivirus and retry');
    console.error('     Some antivirus blocks browser automation');
    console.error('     Add exceptions for: chrome.exe, msedge.exe, firefox.exe');
    console.error('');
  } else {
    console.error('macOS/Linux fixes (try in order):');
    console.error('');
    console.error('  1. Reinstall Playwright browsers:');
    console.error('     npm run install:browsers');
    console.error('     # or: npx playwright install chromium firefox');
    console.error('');
    console.error('  2. On Linux, install system dependencies:');
    console.error('     Ubuntu/Debian:');
    console.error('       sudo apt-get install -y libxss1 libappindicator1');
    console.error('');
    console.error('     Fedora/RHEL:');
    console.error('       sudo dnf install -y chromium');
    console.error('');
    console.error('  3. Kill existing browser processes:');
    console.error('     killall chrome chromium firefox');
    console.error('');
    console.error('  4. Check disk space:');
    console.error('     df -h  # Should have 500MB+ free');
    console.error('');
  }

  console.error('❓ Still not working?');
  console.error('   1. Check Node.js version: node --version');
  console.error('   2. Verify internet connection');
  console.error('   3. Check API key is valid in .env file');
  console.error('   4. Try deleting node_modules and reinstall: npm install');

  process.exit(1);
}
