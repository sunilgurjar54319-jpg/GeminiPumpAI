const databases = require("../config/appwrite");
const { ID, Query, Permission, Role } = require("node-appwrite");


// =========================================
// Update Device Status
// =========================================

async function updateStatus(deviceId, status) {

    status = String(status).toUpperCase();

    if (status !== "ON" && status !== "OFF") {
        throw new Error("Invalid status: " + status);
    }

    try {

        const result = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            "status",
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );

        if (result.documents.length > 0) {

            const updated = await databases.updateDocument(
                process.env.APPWRITE_DATABASE_ID,
                "status",
                result.documents[0].$id,
                {
                    status,
                    updatedAt: new Date().toISOString()
                }
            );

            console.log(
                `📡 Device Status Synced: ${deviceId} → ${status}`
            );

            return updated;
        }

        const deviceResult = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            "devices",
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );

        const ownerId = deviceResult.documents[0]?.ownerId;

        const created = await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            "status",
            ID.unique(),
            {
                deviceId,
                status,
                updatedAt: new Date().toISOString()
            },
            ownerId ? [Permission.read(Role.user(ownerId))] : []
        );

        console.log(
            `📡 Device Status Synced: ${deviceId} → ${status}`
        );

        return created;

    } catch (err) {

        console.error(
            `❌ updateStatus failed: ${err.message}`
        );

        throw err;
    }
}


// =========================================
// Get Device Status
// =========================================

async function getStatus(deviceId) {

    try {

        const result = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            "status",
            [
                Query.equal("deviceId", deviceId),
                Query.limit(1)
            ]
        );

        if (result.documents.length === 0) {

            return {
                deviceId,
                status: "UNKNOWN"
            };
        }

        const doc = result.documents[0];

        if (
            doc.status !== "ON" &&
            doc.status !== "OFF"
        ) {

            return {
                ...doc,
                status: "UNKNOWN"
            };
        }

        return doc;

    } catch (err) {

        console.error(
            `❌ getStatus failed: ${err.message}`
        );

        return {
            deviceId,
            status: "UNKNOWN",
            error: err.message
        };
    }
}



module.exports = {
    updateStatus,
    getStatus
};
