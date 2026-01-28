import 'dotenv/config';
import { validateApiKey } from './src/gpt-groq.js';

async function test() {
  console.log('Testing Groq API key validation...');
  console.log(`API Key: ${process.env.GROQ_API_KEY?.substring(0, 10)}...`);
  
  const isValid = await validateApiKey();
  console.log(`Valid: ${isValid}`);
}

test().catch(console.error);
