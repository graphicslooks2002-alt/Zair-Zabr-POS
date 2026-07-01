const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { ROLES } = require("../middlewares/authorize");
const { isEmail, emailDomainExists, isPhone } = require("../utils/validate");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const publicUser = (u) => ({
  _id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

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

    const { data, error } = await supabase
      .from("users")
      .insert({ name, phone: String(phone), email, password: hash, role })
      .select("*")
      .single();

    if (error) return next(createHttpError(500, error.message));

    res
      .status(201)
      .json({ success: true, message: "New user created!", data: publicUser(data) });
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
      .select("id, name, email, phone, role, created_at")
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

module.exports = { register, login, getUserData, getAllUsers, updateUser, deleteUser, logout };
