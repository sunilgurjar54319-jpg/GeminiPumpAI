const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");
const { updateStatus, getStatus } = require("./statusService");


// =========================================
// Send New Command
// =========================================

async function sendCommand(deviceId, command, source = "MANUAL") {

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


    // =======================================
    // STALE SCHEDULED ON PROTECTION
    // =======================================
    // A missed scheduled ON must never be reused
    // after its scheduled window has already started.
    // Recovery logic will create a fresh ON command.
    // =======================================

    // Pending ON command 20 seconds से पुरानी हो जाए
// तो Recovery नया ON बना सके.
const STALE_AFTER_MS = 5 * 60 * 1000;

    for (const pendingCommand of [...pending.documents]) {

      if (
        pendingCommand.source === "SCHEDULED" &&
        pendingCommand.command === "ON" &&
        pendingCommand.createdAt
      ) {

        const createdAt =
          new Date(pendingCommand.createdAt).getTime();

        if (
          !Number.isNaN(createdAt) &&
          Date.now() - createdAt >= STALE_AFTER_MS
        ) {

          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            "commands",
            pendingCommand.$id,
            {
              executed: true
            }
          );

          console.log(
            `⏭️ Expired stale SCHEDULED ON before new command: ${pendingCommand.$id}`
          );

        }

      }

    }


    // Re-read pending commands after stale cleanup

    const freshPending =
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
      freshPending.documents.find(
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
      freshPending.documents.length === 0 &&
      (currentStatus.status === "ON" ||
       currentStatus.status === "OFF") &&
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

    if (freshPending.documents.length > 0) {

      console.log(
        `📋 Pending ${freshPending.documents.length} command(s) found. Adding ${command} to queue.`
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
          source,
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


    // =========================================
    // STALE SCHEDULED COMMAND PROTECTION
    // =========================================
    // If device/simulator was offline when a
    // scheduled ON was created, do NOT execute
    // that old ON after the scheduled minute has
    // already passed.
    //
    // Scheduled OFF is intentionally NOT skipped.
    // If the pump is already ON, an old OFF command
    // should still be allowed to turn it OFF.
    //
    // MANUAL commands are never affected.
    // =========================================

    const STALE_AFTER_MS = 5 * 60 * 1000;

    for (const pendingCommand of result.documents) {

      if (
        pendingCommand.source === "SCHEDULED" &&
        pendingCommand.command === "ON" &&
        pendingCommand.createdAt
      ) {

        const createdAt =
          new Date(pendingCommand.createdAt).getTime();

        if (
          !Number.isNaN(createdAt) &&
          Date.now() - createdAt >= STALE_AFTER_MS
        ) {

          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            "commands",
            pendingCommand.$id,
            {
              executed: true
            }
          );

          await addHistory(
            pendingCommand.deviceId,
            pendingCommand.command,
            "Expired"
          );

          console.log(
            `⏭️ Expired stale SCHEDULED ON: ${pendingCommand.deviceId} → ${pendingCommand.$id}`
          );

          continue;
        }
      }

      return pendingCommand;
    }


    return {
      command: "NONE"
    };


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
