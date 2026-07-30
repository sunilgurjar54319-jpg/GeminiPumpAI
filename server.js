require("./services/scheduler");
const historyRoutes = require("./routes/history");
const commandRoutes = require("./routes/command");
const deviceRoutes = require("./routes/device");
const geminiRoutes = require("./routes/gemini");
const scheduleRoutes = require("./routes/schedule");
const express = require("express");
const cors = require("cors");
const statusRoutes = require("./routes/status");

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

app.use("/api/gemini", geminiRoutes);

app.use("/api/schedule", scheduleRoutes);

// Server Port
const PORT = 5001;

app.listen(PORT, () => {
    console.log(`🚀 Server Running on Port ${PORT}`);
});
