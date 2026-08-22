const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const DEVICES_COLLECTION =
    process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";


// =========================================
// Register Device
// =========================================

async function registerDevice(deviceId, deviceName, ownerId) {

    try {

        const result = await databases.createDocument(
            DATABASE_ID,
            DEVICES_COLLECTION,
            ID.unique(),
            {
                deviceId,
                deviceName,
                ownerId: ownerId || null,
                status: "OFFLINE",
                wifiStatus: "DISCONNECTED",
                lastSeen: new Date().toISOString(),

                deviceType: "GENERIC",
                sensorEnabled: false,

                voltageSensor: false,
                currentSensor: false,
                floatSensor: false,
                pressureSensor: false,
                temperatureSensor: false
            }
        );

        return result;

    } catch (err) {

        console.error("registerDevice Error:", err.message);
        throw err;

    }

}



// =========================================
// List Devices for Logged-in User
// =========================================
async function listDevices(ownerId) {
    try {
        if (!ownerId) {
            throw new Error("ownerId is required");
        }

        const result = await databases.listDocuments(
            DATABASE_ID,
            DEVICES_COLLECTION,
            [
                Query.equal("ownerId", ownerId),
                Query.limit(100)
            ]
        );

        return result.documents;
    } catch (err) {
        console.error("listDevices Error:", err.message);
        throw err;
    }
}

// =========================================
// ESP32 Heartbeat
// =========================================

async function heartbeatDevice(
    deviceId,
    wifiStatus,
    sensors = {}
) {

    try {

        if (!deviceId) {
            throw new Error("deviceId is required");
        }

        wifiStatus = String(
            wifiStatus || "CONNECTED"
        ).toUpperCase();


        const result = await databases.listDocuments(
            DATABASE_ID,
            DEVICES_COLLECTION,
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );


        if (result.documents.length === 0) {

            throw new Error(
                "Device not registered: " + deviceId
            );

        }


        const device = result.documents[0];


        // =====================================
        // Sensor capability update
        // =====================================

        const updateData = {

            wifiStatus,
            lastSeen: new Date().toISOString()

        };


        // Only update sensor configuration when
        // ESP32 actually sends the sensors object.
        if (
            sensors &&
            typeof sensors === "object" &&
            !Array.isArray(sensors)
        ) {

            updateData.sensorEnabled =
                sensors.enabled === true;

            updateData.voltageSensor =
                sensors.voltage === true;

            updateData.currentSensor =
                sensors.current === true;

            updateData.floatSensor =
                sensors.float === true;

            updateData.pressureSensor =
                sensors.pressure === true;

            updateData.temperatureSensor =
                sensors.temperature === true;

        }


        return await databases.updateDocument(
            DATABASE_ID,
            DEVICES_COLLECTION,
            device.$id,
            updateData
        );

    } catch (err) {

        console.error(
            "heartbeatDevice Error:",
            err.message
        );

        throw err;

    }

}


// =========================================
// Update Device Name
// =========================================

async function updateDeviceName(deviceId, deviceName) {

    try {

        if (!deviceId) {
            throw new Error("deviceId is required");
        }

        const name =
            String(deviceName || "").trim();

        if (!name) {
            throw new Error("deviceName is required");
        }


        const result = await databases.listDocuments(
            DATABASE_ID,
            DEVICES_COLLECTION,
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );


        if (result.documents.length === 0) {

            throw new Error(
                "Device not found: " + deviceId
            );

        }


        const device = result.documents[0];


        return await databases.updateDocument(
            DATABASE_ID,
            DEVICES_COLLECTION,
            device.$id,
            {
                deviceName: name
            }
        );

    } catch (err) {

        console.error(
            "updateDeviceName Error:",
            err.message
        );

        throw err;

    }

}


// =========================================
// Get Device
// =========================================

async function getDevice(deviceId) {

    try {

        const result = await databases.listDocuments(
            DATABASE_ID,
            DEVICES_COLLECTION,
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );


        if (result.documents.length === 0) {

            throw new Error(
                "Device not found: " + deviceId
            );

        }


        const device = result.documents[0];


        return {

            ...device,

            deviceType:
                device.deviceType || "GENERIC",

            sensorEnabled:
                device.sensorEnabled === true,

            voltageSensor:
                device.voltageSensor === true,

            currentSensor:
                device.currentSensor === true,

            floatSensor:
                device.floatSensor === true,

            pressureSensor:
                device.pressureSensor === true,

            temperatureSensor:
                device.temperatureSensor === true

        };

    } catch (err) {

        console.error(
            "getDevice Error:",
            err.message
        );

        throw err;

    }

}


module.exports = {

    getDevice,
    registerDevice,
    listDevices,
    heartbeatDevice,
    updateDeviceName

};
