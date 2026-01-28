# Quick Reference - Input Validation & Type Safety

## New Exports from src/validation.ts

```typescript
// URL Validation
export function isValidQuizUrl(url: string): boolean

// API Key Validation
export function isValidApiKey(key: string): boolean

// Input Sanitization
export function sanitizeInput(input: string): string

// Type Guard for Port
export function validatePort(port: unknown): port is number

// Email Validation
export function isValidEmail(email: string): boolean
```

## New Error Classes from src/utils.ts

```typescript
export class QuizSolverError extends Error
export class InvalidUrlError extends QuizSolverError
export class ApiKeyError extends QuizSolverError
```

## How to Use the Validation Functions

### 1. URL Validation
```typescript
import { isValidQuizUrl } from './validation.js';

const url = 'https://example.com/mod/quiz/attempt.php?attempt=123';
if (isValidQuizUrl(url)) {
  // Safe to use
}
```

### 2. API Key Validation
```typescript
import { isValidApiKey } from './validation.js';

const key = process.env.OPENAI_API_KEY;
if (isValidApiKey(key)) {
  // Key has valid format
}
```

### 3. Input Sanitization
```typescript
import { sanitizeInput } from './validation.js';

const userInput = '  https://example.com  ';
const clean = sanitizeInput(userInput); // 'https://example.com'
```

### 4. Error Handling
```typescript
import { InvalidUrlError, ApiKeyError } from './utils.js';

try {
  // Some operation
} catch (error) {
  if (error instanceof InvalidUrlError) {
    console.log('URL is invalid');
  } else if (error instanceof ApiKeyError) {
    console.log('API key is invalid');
  }
}
```

## What Changed

### navigation.ts
```typescript
// Before: Direct string checking
export async function promptForQuizUrl(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question('📋 Enter quiz URL: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// After: With validation
export async function promptForQuizUrl(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    rl.question('📋 Enter quiz URL: ', (answer) => {
      rl.close();
      const sanitized = sanitizeInput(answer);
      if (!isValidQuizUrl(sanitized)) {
        reject(new Error(
          'Invalid URL. Expected format: /mod/quiz/attempt.php?attempt=123\n' +
          'Please navigate to an active quiz attempt and try again.'
        ));
      }
      resolve(sanitized);
    });
  });
}
```

### gpt.ts
```typescript
// Before: Only API call validation
export async function validateApiKey(): Promise<boolean> {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    printError('Invalid OPENAI_API_KEY. Please check your .env file...');
    return false;
  }
}

// After: Pre-validation + API call
export async function validateApiKey(): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    printError(
      'Invalid OPENAI_API_KEY format. ' +
      'Expected: sk-xxxxx... (40+ characters)\n' +
      'Check your .env file and ensure the key is correct.'
    );
    return false;
  }
  
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    printError('Failed to authenticate with OpenAI API...');
    return false;
  }
}
```

## File Structure
```
src/
├── validation.ts         ← NEW: All validation functions
├── navigation.ts         ← UPDATED: Uses validation
├── gpt.ts               ← UPDATED: Uses validation
├── index.ts             ← UPDATED: Better error handling
├── utils.ts             ← UPDATED: Error classes
├── scraper.ts           ← UPDATED: Type safety
├── browser.ts           ← NO CHANGES
└── overlay.ts           ← NO CHANGES
```

## Testing the Changes

### Test Invalid URL
```bash
bun run start
# When prompted for URL, enter: "invalid url"
# Expected: Clear error message about URL format
```

### Test Invalid API Key
```bash
# Set invalid key in .env
OPENAI_API_KEY=invalid-key

bun run start
# Expected: Error message before trying API call
```

### Test Valid Inputs
```bash
# Set valid key in .env
OPENAI_API_KEY=sk-xxxxxxxxxxxxx...

bun run start
# Enter valid quiz URL
# Expected: Normal operation
```

## Migration Guide (if needed)

If other code needs to use validation:

```typescript
// Import from validation module
import { 
  isValidQuizUrl, 
  isValidApiKey, 
  sanitizeInput,
  validatePort,
  isValidEmail 
} from './validation.js';

// Or import error classes
import { 
  QuizSolverError, 
  InvalidUrlError, 
  ApiKeyError 
} from './utils.js';

// Use in your code
if (!isValidQuizUrl(userUrl)) {
  throw new InvalidUrlError('URL must be a Moodle quiz attempt page');
}
```

## Type Safety Benefits

1. **Compile-time checking**: TypeScript catches errors early
2. **Runtime safety**: Validation prevents bad data
3. **Better error messages**: Know exactly what went wrong
4. **Code documentation**: Type signatures show intent

## Performance Impact

- **Negligible**: ~1ms for URL validation
- **Better**: Prevents wasted API calls with invalid keys
- **Minimal memory**: No additional data structures

---

For full details, see CHANGES_SUMMARY.md and VERIFICATION_CHECKLIST.md
