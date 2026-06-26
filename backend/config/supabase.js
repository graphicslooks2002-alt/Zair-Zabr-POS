const { createClient } = require("@supabase/supabase-js");
const config = require("./config");

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.log("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
