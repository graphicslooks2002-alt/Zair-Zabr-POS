// One-off admin utility: set (or reset) the owner's login password and ensure
// the account is a fully-active Superadmin.
//
// Usage (from the backend folder):
//   node scripts/setOwnerPassword.js "YourNewPassword123!"
//
// Password rule: 8+ chars, upper, lower, number, special.
require("dotenv").config();
const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const OWNER_EMAIL = "graphicslooks2002@gmail.com";
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

(async () => {
  const password = process.argv[2];
  if (!password) {
    console.error('Provide a password:  node scripts/setOwnerPassword.js "YourPassword123!"');
    process.exit(1);
  }
  if (!STRONG.test(password)) {
    console.error("Weak password. Need 8+ chars with uppercase, lowercase, number, and special char.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

  const { data, error } = await supabase
    .from("users")
    .update({
      password: hash,
      role: "Superadmin",
      approved: true,
      email_verified: true,
      is_blocked: false,
    })
    .eq("email", OWNER_EMAIL)
    .select("id, name, email, role")
    .maybeSingle();

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
  if (!data) {
    console.error(`No account found for ${OWNER_EMAIL}. Sign up with this email first, then re-run.`);
    process.exit(1);
  }

  console.log("✅ Owner password set.");
  console.log(`   ${data.name} <${data.email}>  role=${data.role}`);
  console.log(`   Log in at /auth with ${data.email} and your new password.`);
  process.exit(0);
})();
