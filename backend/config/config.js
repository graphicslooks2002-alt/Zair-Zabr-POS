require("dotenv").config();

const config = Object.freeze({
    port: process.env.PORT || 3000,
    nodeEnv : process.env.NODE_ENV || "development",
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    accessTokenSecret: process.env.JWT_SECRET,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpaySecretKey: process.env.RAZORPAY_KEY_SECRET,
    razorpyWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    // Email (Gmail SMTP) for account verification + approval.
    emailUser: process.env.EMAIL_USER,                 // zairzabar21@gmail.com
    emailPass: process.env.EMAIL_PASS,                 // Gmail App Password (16 chars)
    approvalEmail: process.env.APPROVAL_EMAIL || "zairzabar21@gmail.com",
    serverUrl: process.env.SERVER_URL || "https://zairbackend.vercel.app",
    frontendUrl: process.env.FRONTEND_URL || "https://zairfrontend.vercel.app",
});

module.exports = config;
