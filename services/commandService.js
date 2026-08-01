const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");
const { updateStatus, getStatus } = require("./statusService");


// =========================================
// Send New Command
// =========================================

async function sendCommand(deviceId, command) {

  try {

    command = String(command).toUpperCase();

    if (command !== "ON" && command !== "OFF") {
      throw new Error("Invalid command: " + command);
    }


    // =======================================
    // Check pending commands FIRST
    // =======================================

    const pending =
      await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        "commands",
        [
          Query.equal("deviceId", deviceId),
          Query.equal("executed", false),
          Query.orderAsc("$createdAt")
        ]
      );


    // ---------------------------------------
    // Same command already pending
    // ---------------------------------------

    const samePending =
      pending.documents.find(
        doc => doc.command === command
      );

    if (samePending) {

      return {
        ...samePending,
        ignored: true,
        message: "Same command already pending"
      };

    }


    // =======================================
    // Check current status
    // =======================================

    const currentStatus =
      await getStatus(deviceId);


    // ---------------------------------------
    // If no pending command and status
    // already matches requested command
    // ---------------------------------------

    if (
      pending.documents.length === 0 &&
      currentStatus.status === command
    ) {

      return {
        ignored: true,
        message: "Pump already " + command,
        status: currentStatus.status
      };

    }


    // =======================================
    // Opposite command is pending
    //
    // Example:
    // ON pending → now OFF requested
    //
    // DO NOT block OFF.
    // Create OFF as a new command.
    // FIFO execution will process ON first,
    // then OFF.
    // =======================================

    if (pending.documents.length > 0) {

      console.log(
        `📋 Pending ${pending.documents.length} command(s) found. Adding ${command} to queue.`
      );

    }


    // =======================================
    // Create New Command
    // =======================================

    const result =
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        "commands",
        ID.unique(),
        {
          deviceId,
          command,
          executed: false,
          createdAt: new Date().toISOString()
        }
      );


    console.log(
      `📝 Command Queued: ${command} → ${deviceId}`
    );


    return result;


  } catch (err) {

    console.error(
      "❌ sendCommand Error:",
      err.message
    );

    throw err;

  }

}



// =========================================
// Get Pending Command
// =========================================

async function getCommand(deviceId) {

  try {

    const result =
      await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        "commands",
        [
          Query.equal("deviceId", deviceId),
          Query.equal("executed", false),

          // IMPORTANT:
          // Oldest command first.
          // ON must execute before OFF.
          Query.orderAsc("$createdAt")
        ]
      );


    if (result.documents.length === 0) {

      return {
        command: "NONE"
      };

    }


    return result.documents[0];


  } catch (err) {

    console.error(
      "❌ getCommand Error:",
      err.message
    );

    throw err;

  }

}



// =========================================
// Complete Command
// + History
// + Status
// =========================================

async function completeCommand(commandId) {

  try {

    // Get command details
    const command =
      await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID,
        "commands",
        commandId
      );


    // Mark command completed
    const updated =
      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        "commands",
        commandId,
        {
          executed: true
        }
      );


    // Save History
    await addHistory(
      command.deviceId,
      command.command,
      "Completed"
    );


    // Update Current Status
    await updateStatus(
      command.deviceId,
      command.command
    );


    return updated;


  } catch (err) {

    console.error(
      "❌ completeCommand Error:",
      err.message
    );

    throw err;

  }

}



module.exports = {

  sendCommand,
  getCommand,
  completeCommand

};
