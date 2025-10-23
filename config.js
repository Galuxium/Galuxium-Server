const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
module.exports = {
  PORT, FRONTEND_URL,SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY,OPENROUTER_API_URL, GITHUB_TOKEN, VERCEL_TOKEN,GEMINI_API_KEY
};
