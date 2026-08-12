require("dns").setDefaultResultOrder("ipv4first");
require("./services/scheduler");// require("./services/scheduler");
const historyRoutes = require("./routes/history");
const commandRoutes = require("./routes/command");
const deviceRoutes = require("./routes/device");
const geminiRoutes = require("./routes/gemini");
const scheduleRoutes = require("./routes/schedule");
const recoveryRoutes = require("./routes/recovery");
const express = require("express");
const cors = require("cors");
const statusRoutes = require("./routes/status");
const statsRoutes = require("./routes/stats");


const app = express();

app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.send("Gemini Pump AI Server Running");
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Gemini Pump AI API Working"
    });
});

app.use("/api/device", deviceRoutes);

app.use("/api/command", commandRoutes);

app.use("/api/history", historyRoutes);

app.use("/api/status", statusRoutes);

app.use("/api/stats", statsRoutes);

app.use("/api/gemini", geminiRoutes);

app.use("/api/schedule", scheduleRoutes);

app.use("/api/recovery", recoveryRoutes);

// Server Port
const PORT = 5001;

app.listen(PORT, () => {
    console.log(`🚀 Server Running on Port ${PORT}`);
});
