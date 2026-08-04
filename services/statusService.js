const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");


// =========================================
// Update Device Status
// =========================================

async function updateStatus(deviceId, status) {

    status = String(status).toUpperCase();

    if (status !== "ON" && status !== "OFF") {
        throw new Error("Invalid status: " + status);
    }

    const RETRIES = 4;
    const RETRY_DELAY = 2000;

    let lastError;

    for (let attempt = 1; attempt <= RETRIES; attempt++) {

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

            const created = await databases.createDocument(
                process.env.APPWRITE_DATABASE_ID,
                "status",
                ID.unique(),
                {
                    deviceId,
                    status,
                    updatedAt: new Date().toISOString()
                }
            );

            console.log(
                `📡 Device Status Synced: ${deviceId} → ${status}`
            );

            return created;

        } catch (err) {

            lastError = err;

            console.log(
                `⚠️ Status update attempt ${attempt}/${RETRIES}: ${err.message}`
            );

            if (attempt < RETRIES) {
                await new Promise(resolve =>
                    setTimeout(resolve, RETRY_DELAY)
                );
            }
        }
    }

    console.error(
        `❌ updateStatus failed after ${RETRIES} attempts:`,
        lastError?.message
    );

    throw lastError;
}


// =========================================
// Get Device Status
// =========================================

async function getStatus(deviceId) {

    const RETRIES = 4;
    const RETRY_DELAY = 2000;

    let lastError;

    for (let attempt = 1; attempt <= RETRIES; attempt++) {

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

            lastError = err;

            console.log(
                `⚠️ Status read attempt ${attempt}/${RETRIES}: ${err.message}`
            );

            if (attempt < RETRIES) {
                await new Promise(resolve =>
                    setTimeout(resolve, RETRY_DELAY)
                );
            }
        }
    }

    console.error(
        `❌ getStatus failed after ${RETRIES} attempts:`,
        lastError?.message
    );

    return {
        deviceId,
        status: "UNKNOWN",
        error: lastError?.message
    };
}


module.exports = {
    updateStatus,
    getStatus
};
