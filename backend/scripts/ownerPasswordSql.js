// Generate the SQL to set the owner's password on ANY database (no DB connection).
// Use this when the account lives in a different Supabase project than backend/.env
// (e.g. the live/prod DB where you ran the migration in the Supabase dashboard).
//
// Usage (from the backend folder):
//   node scripts/ownerPasswordSql.js "YourNewPassword123!"
//
// Then copy the printed UPDATE and run it in: Supabase Dashboard > SQL Editor.
const bcrypt = require("bcrypt");

const OWNER_EMAIL = "graphicslooks2002@gmail.com";
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

(async () => {
  const password = process.argv[2];
  if (!password) {
    console.error('Provide a password:  node scripts/ownerPasswordSql.js "YourPassword123!"');
    process.exit(1);
  }
  if (!STRONG.test(password)) {
    console.error("Weak password. Need 8+ chars with uppercase, lowercase, number, and special char.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

  console.log("\n-- Run this in the Supabase SQL Editor of your LIVE/prod project --\n");
  console.log(
    `update users set\n` +
    `  password = '${hash}',\n` +
    `  role = 'Superadmin',\n` +
    `  approved = true,\n` +
    `  email_verified = true,\n` +
    `  is_blocked = false\n` +
    `where lower(email) = '${OWNER_EMAIL}';\n`
  );
  console.log("-- After it runs, log in at /auth with", OWNER_EMAIL, "and your password.\n");
})();
