const createHttpError = require("http-errors");
const supabase = require("../config/supabase");

// Returns the currently open session row, or null.
const findOpenSession = async () => {
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "open")
    .maybeSingle();
  return data || null;
};

const getCurrentSession = async (req, res, next) => {
  try {
    const session = await findOpenSession();
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

const openSession = async (req, res, next) => {
  try {
    const existing = await findOpenSession();
    if (existing) {
      return next(createHttpError(400, "A session is already open!"));
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({ opened_by: req.user?._id || null })
      .select("*")
      .single();

    if (error) return next(createHttpError(500, error.message));

    res.status(201).json({ success: true, message: "Session opened!", data });
  } catch (error) {
    next(error);
  }
};

const closeSession = async (req, res, next) => {
  try {
    const existing = await findOpenSession();
    if (!existing) {
      return next(createHttpError(400, "No open session to close!"));
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ success: true, message: "Session closed!", data });
  } catch (error) {
    next(error);
  }
};

module.exports = { findOpenSession, getCurrentSession, openSession, closeSession };
