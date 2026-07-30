const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");


// Add History
async function addHistory(deviceId, command, result) {

    const history = await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        "history",
        ID.unique(),
        {
            deviceId,
            command,
            result,
            createdAt: new Date().toISOString()
        }
    );

    return history;
}


// Get History
async function getHistory(deviceId) {

    const history = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        "history",
        [
            Query.equal("deviceId", deviceId)
        ]
    );

    return history.documents;
}


module.exports = {
    addHistory,
    getHistory
};
