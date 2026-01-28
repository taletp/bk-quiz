// ============================================================================
// Input Validation Functions
// ============================================================================

/**
 * Validates that a URL is a valid Moodle quiz attempt page
 * Checks for the required URL pattern: /mod/quiz/attempt.php?attempt=
 *
 * @param url - The URL to validate
 * @returns true if URL matches quiz attempt pattern, false otherwise
 */
export function isValidQuizUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/mod/quiz/attempt.php') && 
           urlObj.searchParams.has('attempt');
  } catch {
    return false;
  }
}

/**
 * Validates OpenAI API key format
 * Checks for sk- prefix and minimum length requirement
 *
 * @param key - The API key to validate
 * @returns true if key has valid format, false otherwise
 */
export function isValidApiKey(key: string): boolean {
  return typeof key === 'string' && key.startsWith('sk-') && key.length > 40;
}

/**
 * Sanitizes input by removing leading/trailing whitespace
 *
 * @param input - The input string to sanitize
 * @returns Trimmed input string
 */
export function sanitizeInput(input: string): string {
  return input.trim();
}

/**
 * Type guard to validate a port number
 * Checks if value is a number between 1 and 65535
 *
 * @param port - The value to validate
 * @returns true if port is valid number port, false otherwise
 */
export function validatePort(port: unknown): port is number {
  return typeof port === 'number' && port > 0 && port < 65536;
}

/**
 * Validates email address format using regex
 * Basic validation: something@something.something
 *
 * @param email - The email address to validate
 * @returns true if email matches basic pattern, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
