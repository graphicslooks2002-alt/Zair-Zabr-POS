const nodemailer = require("nodemailer");
const config = require("../config/config");

// Gmail SMTP. Requires EMAIL_USER + EMAIL_PASS (App Password) in env.
let transporter = null;
const getTransporter = () => {
  if (!config.emailUser || !config.emailPass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.emailUser, pass: config.emailPass },
    });
  }
  return transporter;
};

const FROM = () => `"Zair Zabar POS" <${config.emailUser}>`;

const shell = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">
    <h2 style="color:#e85d04;letter-spacing:1px;margin:0 0 4px">ZAIR ZABAR POS</h2>
    <h3 style="margin:16px 0 8px">${title}</h3>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
    <p style="font-size:12px;color:#888">If you didn't expect this email, you can ignore it.</p>
  </div>`;

const button = (href, label, color = "#e85d04") =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;margin-top:8px">${label}</a>`;

// Sent to the NEW user's inbox to confirm they own the mailbox.
const sendVerifyEmail = async (user, verifyUrl) => {
  const t = getTransporter();
  if (!t) throw new Error("Email service not configured (EMAIL_USER/EMAIL_PASS missing).");
  await t.sendMail({
    from: FROM(),
    to: user.email,
    subject: "Verify your Zair Zabar POS account",
    html: shell(
      `Hi ${user.name}, please verify your email`,
      `<p>An account was created for you (role: <b>${user.role}</b>). Click below to confirm this email address:</p>
       <p>${button(verifyUrl, "Verify Email")}</p>
       <p style="font-size:12px;color:#888">This link expires in 2 days. After verifying, an admin will approve your account.</p>`
    ),
  });
};

// Sent to the official approval inbox after the user verifies their email.
const sendApprovalEmail = async (user, approveUrl) => {
  const t = getTransporter();
  if (!t) throw new Error("Email service not configured (EMAIL_USER/EMAIL_PASS missing).");
  await t.sendMail({
    from: FROM(),
    to: config.approvalEmail,
    subject: `Approve new ${user.role}: ${user.name}`,
    html: shell(
      "New account awaiting approval",
      `<p>This user verified their email and is awaiting your approval:</p>
       <ul>
         <li><b>Name:</b> ${user.name}</li>
         <li><b>Email:</b> ${user.email}</li>
         <li><b>Phone:</b> ${user.phone}</li>
         <li><b>Role:</b> ${user.role}</li>
       </ul>
       <p>${button(approveUrl, "Approve Account", "#02ca3a")}</p>
       <p style="font-size:12px;color:#888">Only approve if you recognize this person.</p>`
    ),
  });
};

module.exports = { sendVerifyEmail, sendApprovalEmail, getTransporter };
