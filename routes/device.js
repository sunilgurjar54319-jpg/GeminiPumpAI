const express = require("express");
const router = express.Router();

const {
    requireAuth,
    requireDeviceOwner
} = require("../middleware/auth");

const {
    registerDevice,
    heartbeatDevice,
    getDevice,
    updateDeviceName
} = require("../services/deviceService");


// =========================================
// Register Device
// =========================================

router.post("/register", async (req, res) => {

    try {

        const {
            deviceId,
            deviceName
        } = req.body;

        const result =
            await registerDevice(
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
            wifiStatus,
            sensors
        } = req.body;


        const result =
            await heartbeatDevice(
                deviceId,
                wifiStatus,
                sensors
            );


        res.json({

            success: true,

            deviceId:
                result.deviceId,

            deviceName:
                result.deviceName ||
                result.deviceId,

            deviceType:
                result.deviceType ||
                "GENERIC",

            sensorEnabled:
                result.sensorEnabled === true,

            sensors: {

                voltage:
                    result.voltageSensor === true,

                current:
                    result.currentSensor === true,

                float:
                    result.floatSensor === true,

                pressure:
                    result.pressureSensor === true,

                temperature:
                    result.temperatureSensor === true

            },

            wifiStatus:
                result.wifiStatus,

            lastSeen:
                result.lastSeen

        });

    } catch (err) {

        console.error(
            "Heartbeat Error:",
            err.message
        );

        res.status(500).json({

            success: false,
            error: err.message

        });

    }

});


// =========================================
// Update Device Name
// =========================================

router.put(
    "/:deviceId/name",
    requireAuth,
    async (req, res) => {

    try {

        const {
            deviceName
        } = req.body;


        const result =
            await updateDeviceName(
                req.params.deviceId,
                deviceName
            );


        res.json({

            success: true,

            deviceId:
                result.deviceId,

            deviceName:
                result.deviceName

        });

    } catch (err) {

        console.error(
            "Update Device Name Error:",
            err.message
        );

        res.status(400).json({

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

        const result =
            await getDevice(
                req.params.deviceId
            );


        res.json({

            success: true,

            deviceId:
                result.deviceId,

            deviceName:
                result.deviceName ||
                result.deviceId,

            deviceType:
                result.deviceType ||
                "GENERIC",

            sensorEnabled:
                result.sensorEnabled === true,

            sensors: {

                voltage:
                    result.voltageSensor === true,

                current:
                    result.currentSensor === true,

                float:
                    result.floatSensor === true,

                pressure:
                    result.pressureSensor === true,

                temperature:
                    result.temperatureSensor === true

            },

            wifiStatus:
                result.wifiStatus,

            lastSeen:
                result.lastSeen

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
