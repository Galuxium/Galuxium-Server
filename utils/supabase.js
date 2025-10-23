// backend/utils/supabase.js
const { createClient } = require("@supabase/supabase-js");
const dotenv = require ("dotenv");
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase server environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // prefer using explicit fetch implementation in Node 18+ environments
  // any other options can be added here
});
module.exports = { supabase };
