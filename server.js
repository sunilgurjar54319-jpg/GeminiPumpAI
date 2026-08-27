const path = require("path");
require("dns").setDefaultResultOrder("ipv4first");
require("./services/scheduler");// require("./services/scheduler");
const historyRoutes = require("./routes/history");
const commandRoutes = require("./routes/command");
const deviceRoutes = require("./routes/device");
const geminiRoutes = require("./routes/gemini");
const scheduleRoutes = require("./routes/schedule");
const recoveryRoutes = require("./routes/recovery");
const authRoutes = require("./routes/auth");
const biometricRoutes = require("./routes/biometric");
const express = require("express");
const cors = require("cors");
const statusRoutes = require("./routes/status");
const statsRoutes = require("./routes/stats");


const app = express();

const frontendDist = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDist));

app.use(cors());
app.use(express.json());



// Test API
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Gemini Pump AI API Working"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/biometric", biometricRoutes);

app.use("/api/device", deviceRoutes);

app.use("/api/command", commandRoutes);

app.use("/api/history", historyRoutes);

app.use("/api/status", statusRoutes);

app.use("/api/stats", statsRoutes);

app.use("/api/gemini", geminiRoutes);

app.use("/api/schedule", scheduleRoutes);

app.use("/api/recovery", recoveryRoutes);

// React SPA fallback
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return next();
    }

    res.sendFile(
        path.join(frontendDist, "index.html"),
        (err) => {
            if (err) next(err);
        }
    );
});

// Server Port
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`🚀 Server Running on Port ${PORT}`);
});
