const express = require("express");
const config = require("./config/config");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

const PORT = config.port;

// Middlewares
app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5174',
            'http://localhost:5173',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // allow all for now
        }
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

// Global Error Handler
app.use(globalErrorHandler);

// Server (only in non-serverless)
if (process.env.VERCEL !== "1") {
    app.listen(PORT, () => {
        console.log(`POS Server is listening on port ${PORT}`);
    });
}

module.exports = app;
