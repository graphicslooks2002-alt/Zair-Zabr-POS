// Create (or promote) the hidden Superadmin owner account on the DB pointed to
// by backend/.env. Idempotent: if the email already exists it is promoted +
// its password reset; otherwise a new active Superadmin is inserted.
//
// Usage (from the backend folder):
//   node scripts/createOwner.js "YourPassword123!"
//
// Password rule: 8+ chars, upper, lower, number, special.
require("dotenv").config();
const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const OWNER_EMAIL = "graphicslooks2002@gmail.com";
const OWNER_NAME = "Owner";
const OWNER_PHONE = "03000000000"; // placeholder — edit later in Manage Staff if needed
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

(async () => {
  const password = process.argv[2];
  if (!password) {
    console.error('Provide a password:  node scripts/createOwner.js "YourPassword123!"');
    process.exit(1);
  }
  if (!STRONG.test(password)) {
    console.error("Weak password. Need 8+ chars with uppercase, lowercase, number, and special char.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

  const { data: existing } = await supabase
    .from("users").select("id").eq("email", OWNER_EMAIL).maybeSingle();

  const fields = {
    password: hash,
    role: "Superadmin",
    approved: true,
    email_verified: true,
    is_blocked: false,
  };

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from("users").update(fields).eq("id", existing.id).select("id, email, role").maybeSingle());
  } else {
    ({ data, error } = await supabase
      .from("users").insert({ name: OWNER_NAME, phone: OWNER_PHONE, email: OWNER_EMAIL, ...fields })
      .select("id, email, role").maybeSingle());
  }

  if (error) {
    console.error("Failed:", error.message);
    if (/role/i.test(error.message) && /constraint|check/i.test(error.message)) {
      console.error("\nThe role CHECK constraint is blocking 'Superadmin'. Run this in the Supabase SQL Editor, then re-run:");
      console.error("  alter table users drop constraint if exists users_role_chk;");
      console.error("  alter table users add constraint users_role_chk check (role in ('Superadmin','Admin','Cashier','Waiter'));");
    }
    process.exit(1);
  }

  console.log("✅ Owner ready:", data.email, "| role:", data.role);
  console.log("   Log in at /auth with", OWNER_EMAIL, "and your password.");
  process.exit(0);
})();
