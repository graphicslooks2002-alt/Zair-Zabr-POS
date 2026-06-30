const express = require("express");
const config = require("./config/config");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const createHttpError = require("http-errors");
const app = express();

const PORT = config.port;

// Trust the Vercel/proxy hop so rate-limit & secure cookies see the real client.
app.set("trust proxy", 1);

// Middlewares
app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5174',
            'http://localhost:5173',
            'https://zairfrontend.vercel.app', // production frontend (fallback if FRONTEND_URL unset)
            process.env.FRONTEND_URL
        ].filter(Boolean);
        // No origin = same-origin / server-to-server (curl, Postman) → allow.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(createHttpError(403, "Not allowed by CORS"));
    }
}));
app.use(express.json());
app.use(cookieParser());

// Root Endpoint
app.get("/", (req, res) => {
    res.json({ message: "Hello from Zair Zabar POS Server!" });
});

// Other Endpoints
app.use("/api/user", require("./routes/userRoute"));
app.use("/api/order", require("./routes/orderRoute"));
app.use("/api/table", require("./routes/tableRoute"));
app.use("/api/payment", require("./routes/paymentRoute"));
app.use("/api/report", require("./routes/reportRoute"));
app.use("/api/session", require("./routes/sessionRoute"));
app.use("/api/pending", require("./routes/pendingRoute"));
app.use("/api/menu", require("./routes/menuRoute"));

// Global Error Handler
app.use(globalErrorHandler);

// Server (only in non-serverless)
if (process.env.VERCEL !== "1") {
    app.listen(PORT, () => {
        console.log(`POS Server is listening on port ${PORT}`);
    });
}

module.exports = app;
