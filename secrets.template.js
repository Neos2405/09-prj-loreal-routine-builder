/* OpenAI API Configuration Template */
/* 
  INSTRUCTIONS:
  1. Copy this file and rename it to "secrets.js"
  2. Replace "YOUR_OPENAI_API_KEY_HERE" with your actual OpenAI API key
  3. Never commit the secrets.js file to version control
  4. The secrets.js file is already in .gitignore to prevent accidental commits
*/

const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE";

/* OpenAI API Configuration */
const OPENAI_CONFIG = {
  apiKey: OPENAI_API_KEY,
  apiUrl: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o",
  maxTokens: 1000,
  temperature: 0.7
};
