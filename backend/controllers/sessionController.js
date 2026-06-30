const supabase = require("../config/supabase");

// Business session is automatic: opens 12:00 PM, closes 4:00 AM next day (Pakistan time, UTC+5).
const TZ_OFFSET_MS = 5 * 3600 * 1000; // Asia/Karachi = UTC+5 (no DST)
const SESSION_OPEN_HOUR = 12; // 12 PM
const SESSION_LENGTH_MS = 16 * 3600 * 1000; // 12 PM -> 4 AM next day = 16h

// Returns the current business session window as real UTC instants.
// If now is before noon PKT, the active window started the previous day at noon.
const getCurrentSessionWindow = () => {
  const now = Date.now();
  const pkt = new Date(now + TZ_OFFSET_MS); // read wall-clock via getUTC* methods
  const y = pkt.getUTCFullYear();
  const m = pkt.getUTCMonth();
  const d = pkt.getUTCDate();
  const h = pkt.getUTCHours();

  // noon PKT today, expressed as a real UTC instant (12:00 PKT = 07:00 UTC)
  let startMs = Date.UTC(y, m, d, SESSION_OPEN_HOUR, 0, 0) - TZ_OFFSET_MS;
  if (h < SESSION_OPEN_HOUR) startMs -= 24 * 3600 * 1000; // before noon -> yesterday's session
  const endMs = startMs + SESSION_LENGTH_MS;

  return { start: new Date(startMs), end: new Date(endMs) };
};

const getCurrentSession = async (req, res, next) => {
  try {
    const { start, end } = getCurrentSessionWindow();
    const active = Date.now() < end.getTime();
    res.status(200).json({
      success: true,
      data: {
        auto: true,
        opened_at: start.toISOString(),
        closes_at: end.toISOString(),
        active, // true while inside 12 PM–4 AM
        label: "12:00 PM – 4:00 AM",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCurrentSessionWindow, getCurrentSession, supabase };
