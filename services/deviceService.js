const databases = require("../config/appwrite");
const { ID } = require("node-appwrite");

async function registerDevice(deviceId, deviceName) {
    try {
        const result = await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_DEVICES_COLLECTION_ID,
            ID.unique(),
            {
                deviceId,
                deviceName,
                status: "OFFLINE"
            }
        );

        return result;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports = {
    registerDevice
};
