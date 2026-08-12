const express = require("express");
const router = express.Router();

const {
    registerDevice,
    heartbeatDevice,
    getDevice
} = require("../services/deviceService");

// =========================================
// Register Device
// =========================================

router.post("/register", async (req, res) => {

    try {

        const { deviceId, deviceName } = req.body;

        const result = await registerDevice(
            deviceId,
            deviceName
        );

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

// =========================================
// ESP32 Heartbeat
// =========================================

router.post("/heartbeat", async (req, res) => {

    try {

        const {
            deviceId,
            wifiStatus
        } = req.body;

        const result = await heartbeatDevice(
            deviceId,
            wifiStatus
        );

        res.json({
            success: true,
            deviceId: result.deviceId,
            wifiStatus: result.wifiStatus,
            lastSeen: result.lastSeen
        });

    } catch (err) {

        console.error("Heartbeat Error:", err.message);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

// =========================================
// Get ESP32 Connection Status
// =========================================

router.get("/:deviceId", async (req, res) => {

    try {

        const result = await getDevice(
            req.params.deviceId
        );

        res.json({
            success: true,
            deviceId: result.deviceId,
            wifiStatus: result.wifiStatus,
            lastSeen: result.lastSeen
        });

    } catch (err) {

        console.error(
            "Get Device Error:",
            err.message
        );

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

module.exports = router;
