const express = require("express");
const router = express.Router();
const databases = require("../config/appwrite");
const { Query } = require("node-appwrite");

const {
    requireAuth,
    requireDeviceOwner
} = require("../middleware/auth");

const {
    registerDevice,
    heartbeatDevice,
    getDevice,
    updateDeviceName,
    listDevices
} = require("../services/deviceService");


// =========================================
// Register Device
// =========================================

router.post("/register", requireAuth, async (req, res) => {
    try {
        const { deviceId, deviceName } = req.body;

        if (!deviceId || !String(deviceId).trim()) {
            return res.status(400).json({
                success: false,
                error: "deviceId is required"
            });
        }

        const cleanDeviceId = String(deviceId).trim();
        const cleanDeviceName =
            String(deviceName || cleanDeviceId).trim();

        const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
        const DEVICES_COLLECTION =
            process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";

        // Check duplicate Device ID
        const existing = await databases.listDocuments(
            DATABASE_ID,
            DEVICES_COLLECTION,
            [
                Query.equal("deviceId", cleanDeviceId),
                Query.limit(1)
            ]
        );

        if (existing.documents.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Device already exists",
                deviceId: cleanDeviceId
            });
        }

        const result = await registerDevice(
            cleanDeviceId,
            cleanDeviceName,
            req.userId
        );

        res.json({
            success: true,
            device: result
        });

    } catch (err) {
        console.error("Register Device Error:", err.message);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// =========================================
// List Devices for Current User
// =========================================
router.get("/list", requireAuth, async (req, res) => {
    try {
        const devices = await listDevices(req.userId);

        res.json({
            success: true,
            devices
        });

    } catch (err) {
        console.error("List Devices Error:", err.message);

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
