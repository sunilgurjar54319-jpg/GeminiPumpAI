const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const HISTORY_COLLECTION = "history";

// =========================================
// Add History
// =========================================

async function addHistory(deviceId, command, result) {

  try {

    if (!deviceId) {
      throw new Error("deviceId is required");
    }

    command = String(command || "").toUpperCase();
    result = String(result || "Completed");

    if (command !== "ON" && command !== "OFF") {
      throw new Error(
        "Invalid history command: " + command
      );
    }

    const document =
      await databases.createDocument(
        DATABASE_ID,
        HISTORY_COLLECTION,
        ID.unique(),
        {
          deviceId,
          command,
          result,
          createdAt: new Date().toISOString()
        }
      );

    console.log(
      `History Saved: ${deviceId} -> ${command} | ${result}`
    );

    return document;

  } catch (error) {

    console.error(
      "addHistory Error:",
      error.message
    );

    throw error;

  }

}


// =========================================
// Get History
// =========================================

async function getHistory(deviceId) {

  try {

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        HISTORY_COLLECTION,
        [
          Query.equal(
            "deviceId",
            deviceId
          ),
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );

    return result.documents;

  } catch (error) {

    console.error(
      "getHistory Error:",
      error.message
    );

    throw error;

  }

}


// =========================================
// Clear History
// =========================================

async function clearHistory(deviceId) {

  try {

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        HISTORY_COLLECTION,
        [
          Query.equal(
            "deviceId",
            deviceId
          )
        ]
      );

    let deleted = 0;

    for (const item of result.documents) {

      await databases.deleteDocument(
        DATABASE_ID,
        HISTORY_COLLECTION,
        item.$id
      );

      deleted++;

    }

    return {
      success: true,
      deviceId,
      deleted
    };

  } catch (error) {

    console.error(
      "clearHistory Error:",
      error.message
    );

    throw error;

  }

}


module.exports = {
  addHistory,
  getHistory,
  clearHistory
};
