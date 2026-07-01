const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { ROLES } = require("../middlewares/authorize");
const { isEmail, emailDomainExists, isPhone } = require("../utils/validate");
const { sendVerifyEmail, sendApprovalEmail } = require("../utils/mailer");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusOf = (u) =>
  u.approved ? "Active" : u.email_verified ? "Pending Approval" : "Pending Verification";

const publicUser = (u) => ({
  _id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  emailVerified: !!u.email_verified,
  approved: !!u.approved,
  status: statusOf(u),
});

// Signed, expiring token for email links (verify / approve).
const linkToken = (id, purpose, expiresIn) =>
  jwt.sign({ _id: id, purpose }, config.accessTokenSecret, { expiresIn });

// Minimal HTML page for the clickable email links.
const htmlPage = (title, msg, color = "#e85d04") => `
  <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title></head>
  <body style="font-family:Arial,sans-serif;background:#1f1f1f;color:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center;max-width:420px;padding:32px;background:#262626;border-radius:12px">
      <h1 style="color:${color};letter-spacing:1px">ZAIR ZABAR POS</h1>
      <h2>${title}</h2><p style="color:#ababab">${msg}</p>
    </div>
  </body></html>`;

// Secure cross-site cookies in prod (https); relaxed for local http dev.
const isProd = config.nodeEnv === "production";
const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

const register = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    let { email, role } = req.body;

    if (!name || !phone || !email || !password || !role) {
      return next(createHttpError(400, "Please fill in all the required fields."));
    }

    email = String(email).trim().toLowerCase();

    if (!isEmail(email)) {
      return next(createHttpError(400, "Please enter a valid email address."));
    }
    if (!(await emailDomainExists(email))) {
      return next(createHttpError(400, "This email address doesn't seem to exist. Please check for typos."));
    }
    if (!isPhone(phone)) {
      return next(createHttpError(400, "Phone must be 11 digits, e.g. 03001234567."));
    }
    if (password.length < 6) {
      return next(createHttpError(400, "Password must be at least 6 characters."));
    }

    // First user (bootstrap) is always Admin; otherwise role must be valid.
    if (req.isBootstrap) {
      role = "Admin";
    } else if (!ROLES.includes(role)) {
      return next(createHttpError(400, `Role must be one of: ${ROLES.join(", ")}`));
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return next(createHttpError(400, "An account with this email already exists."));
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Bootstrap (first-ever) admin is auto-active; everyone else must verify + be approved.
    const bootstrap = !!req.isBootstrap;

    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        phone: String(phone),
        email,
        password: hash,
        role,
        email_verified: bootstrap,
        approved: bootstrap,
      })
      .select("*")
      .single();

    if (error) return next(createHttpError(500, error.message));

    if (bootstrap) {
      return res.status(201).json({ success: true, message: "Admin account created!", data: publicUser(data) });
    }

    // Send the verification email to the new user's inbox.
    let emailSent = true;
    try {
      const verifyUrl = `${config.serverUrl}/api/user/verify?token=${linkToken(data.id, "verify", "2d")}`;
      await sendVerifyEmail(data, verifyUrl);
    } catch (e) {
      emailSent = false;
      console.log("Verify email failed:", e.message);
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? `Account created. A verification link was sent to ${email}. After they verify, you'll get an approval email.`
        : `Account created, but the verification email could not be sent. Check email settings.`,
      data: publicUser(data),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/user/verify?token=...  — confirms email ownership, then emails the approver.
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    let decoded;
    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (_) {
      return res.status(400).send(htmlPage("Link expired", "This verification link is invalid or has expired.", "#d00000"));
    }
    if (decoded.purpose !== "verify") {
      return res.status(400).send(htmlPage("Invalid link", "This link can't be used to verify.", "#d00000"));
    }

    const { data: user } = await supabase.from("users").select("*").eq("id", decoded._id).maybeSingle();
    if (!user) return res.status(404).send(htmlPage("Not found", "Account no longer exists.", "#d00000"));

    if (!user.email_verified) {
      await supabase.from("users").update({ email_verified: true }).eq("id", user.id);
    }

    // Notify the approver (unless already approved).
    if (!user.approved) {
      try {
        const approveUrl = `${config.serverUrl}/api/user/approve?token=${linkToken(user.id, "approve", "7d")}`;
        await sendApprovalEmail(user, approveUrl);
      } catch (e) {
        console.log("Approval email failed:", e.message);
      }
    }

    res.status(200).send(
      htmlPage("Email verified ✅", "Thanks! Your email is confirmed. An admin will approve your account shortly — you'll be able to log in after approval.", "#02ca3a")
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/user/approve?token=...  — approver confirms the account.
const approveUser = async (req, res, next) => {
  try {
    const { token } = req.query;
    let decoded;
    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (_) {
      return res.status(400).send(htmlPage("Link expired", "This approval link is invalid or has expired.", "#d00000"));
    }
    if (decoded.purpose !== "approve") {
      return res.status(400).send(htmlPage("Invalid link", "This link can't be used to approve.", "#d00000"));
    }

    const { data: user } = await supabase.from("users").select("*").eq("id", decoded._id).maybeSingle();
    if (!user) return res.status(404).send(htmlPage("Not found", "Account no longer exists.", "#d00000"));

    await supabase.from("users").update({ approved: true, email_verified: true }).eq("id", user.id);

    res.status(200).send(
      htmlPage("Account approved ✅", `${user.name} (${user.role}) can now log in to Zair Zabar POS.`, "#02ca3a")
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    let { email } = req.body;
    const { password } = req.body;

    if (!email || !password) {
      return next(createHttpError(400, "Please fill in all the required fields."));
    }

    email = String(email).trim().toLowerCase();

    if (!isEmail(email)) {
      return next(createHttpError(400, "Please enter a valid email address."));
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return next(createHttpError(401, "Incorrect email or password."));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createHttpError(401, "Incorrect email or password."));
    }

    // Gate: account must have a verified email AND admin approval.
    if (!user.email_verified) {
      return next(createHttpError(403, "Please verify your email first. Check your inbox for the verification link."));
    }
    if (!user.approved) {
      return next(createHttpError(403, "Your account is pending admin approval. You'll be able to log in once approved."));
    }

    const accessToken = jwt.sign(
      { _id: user.id, role: user.role },
      config.accessTokenSecret,
      { expiresIn: "1d" }
    );

    res.cookie("accessToken", accessToken, {
      ...cookieBase,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.status(200).json({
      success: true,
      message: "User login successfully!",
      data: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role, email_verified, approved, created_at")
      .order("created_at", { ascending: false });

    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ success: true, data: data.map(publicUser) });
  } catch (error) {
    next(error);
  }
};

const getUserData = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role")
      .eq("id", req.user._id)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "User not found!"));
    }

    res.status(200).json({ success: true, data: publicUser(data) });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid staff id."));

    const { name, phone, role, password } = req.body;
    const patch = {};
    if (name !== undefined) {
      if (!name.trim()) return next(createHttpError(400, "Name cannot be empty."));
      patch.name = name.trim();
    }
    if (phone !== undefined) {
      if (!isPhone(phone)) return next(createHttpError(400, "Phone must be 11 digits, e.g. 03001234567."));
      patch.phone = String(phone);
    }
    if (role !== undefined) {
      if (!ROLES.includes(role)) return next(createHttpError(400, "Invalid role."));
      patch.role = role;
    }
    if (password) {
      if (password.length < 6) return next(createHttpError(400, "Password must be at least 6 characters."));
      patch.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
    }

    const { data, error } = await supabase.from("users").update(patch).eq("id", id).select("*").single();
    if (error || !data) return next(createHttpError(404, "Staff member not found."));

    res.status(200).json({ success: true, message: "Staff updated!", data: publicUser(data) });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid staff id."));
    if (id === req.user._id) {
      return next(createHttpError(400, "You cannot delete your own account."));
    }
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) return next(createHttpError(500, error.message));
    res.status(200).json({ success: true, message: "Staff deleted." });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken", cookieBase);
    res.status(200).json({ success: true, message: "User logout successfully!" });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, verifyEmail, approveUser, getUserData, getAllUsers, updateUser, deleteUser, logout };
