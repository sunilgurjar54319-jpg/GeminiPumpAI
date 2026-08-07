const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");

// Add History
async function addHistory(deviceId, command, result) {

  return await databases.createDocument(
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

}

// Get History
async function getHistory(deviceId) {

  const history = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    "history",
    [
      Query.equal("deviceId", deviceId),
      Query.orderDesc("$createdAt"),
      Query.limit(100)
    ]
  );

  return history.documents;

}

// Clear History
async function clearHistory(deviceId) {

  const history = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    "history",
    [
      Query.equal("deviceId", deviceId)
    ]
  );

  for (const item of history.documents) {

    await databases.deleteDocument(
      process.env.APPWRITE_DATABASE_ID,
      "history",
      item.$id
    );

  }

  return {
    success: true
  };

}

module.exports = {
  addHistory,
  getHistory,
  clearHistory
};
