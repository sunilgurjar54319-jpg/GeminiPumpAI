const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");
const { updateStatus, getStatus } = require("./statusService");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COMMAND_COLLECTION = "commands";


// ==================================// SEND NEW COMMAND
// ==================================
async function sendCommand(deviceId, command, source = "MANUAL") {

  try {

    command = String(command || "").toUpperCase();

    if (command !== "ON" && command !== "OFF") {
      throw new Error("Invalid command: " + command);
    }


    // ================================    // Get pending commands
    // ================================
    const pending =
      await databases.listDocuments(
        DATABASE_ID,
        COMMAND_COLLECTION,
        [
          Query.equal("deviceId", deviceId),
          Query.equal("executed", false),
          Query.orderAsc("$createdAt")
        ]
      );


    // ================================    // STALE SCHEDULED ON PROTECTION
    // ================================    // A missed scheduled ON must never be reused
    // after its scheduled window has already started.
    // Recovery logic will create a fresh ON command.
    // ================================
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
    // ================================
    const samePending =
      freshPending.documents.find(
        doc => String(doc.command).toUpperCase() === command
      );


    if (samePending) {

      return {
        ...samePending,
        ignored: true,
        message: "Same command already pending"
      };

    }


    // ================================    // Current pump status
    // ================================
    let currentStatus;

    try {

      currentStatus = await getStatus(deviceId);

    } catch (error) {

      console.log(
        "Status check failed:",
        error.message
      );

      currentStatus = {
        status: "UNKNOWN"
      };

    }


    const currentState =
      String(currentStatus?.status || "UNKNOWN").toUpperCase();


    // ================================
    // Already in requested state
    // ================================

    if (
      freshPending.documents.length === 0 &&
      currentState === command
    ) {

      console.log(
        `Command ignored: ${deviceId} already ${command}`
      );

      return {
        ignored: true,
        message: "Pump already " + command,
        status: currentState
      };

    }


    // ================================    // Pending command exists
    // ================================
    if (freshPending.documents.length > 0) {

      console.log(
        `📋 Pending ${freshPending.documents.length} command(s) found. Adding ${command} to queue.`
      );

    }


    // ================================    // Create command
    // ================================
    const result =
      await databases.createDocument(
        DATABASE_ID,
        COMMAND_COLLECTION,
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
      `Command Queued: ${command} -> ${deviceId}`
    );


    return result;


  } catch (err) {

    console.error(
      "sendCommand Error:",
      err.message
    );

    throw err;

  }

}



// ==================================// GET PENDING COMMAND
// ==================================
async function getCommand(deviceId) {

  try {

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        COMMAND_COLLECTION,
        [
          Query.equal("deviceId", deviceId),
          Query.equal("executed", false),
          Query.orderAsc("$createdAt")
        ]
      );


    if (result.documents.length === 0) {

      return {
        command: "NONE"
      };

    }


    // ==================================    // STALE SCHEDULED COMMAND PROTECTION
    // ==================================    // If device/simulator was offline when a
    // scheduled ON was created, do NOT execute
    // that old ON after the scheduled minute has
    // already passed.
    //
    // Scheduled OFF is intentionally NOT skipped.
    // If the pump is already ON, an old OFF command
    // should still be allowed to turn it OFF.
    //
    // MANUAL commands are never affected.
    // ==================================
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
      "getCommand Error:",
      err.message
    );

    throw err;

  }

}



// ==================================// COMPLETE COMMAND
//
// IMPORTANT:
// History is created ONLY when actual
// status changes.
//
// OFF -> OFF = no history
// ON  -> ON  = no history
// OFF -> ON  = history
// ON  -> OFF = history
// ==================================
async function completeCommand(commandId) {

  try {

    // ================================    // Get command
    // ================================
    const command =
      await databases.getDocument(
        DATABASE_ID,
        COMMAND_COLLECTION,
        commandId
      );


    if (!command) {
      throw new Error("Command not found");
    }


    const deviceId =
      command.deviceId;

    const requestedCommand =
      String(command.command).toUpperCase();


    if (
      requestedCommand !== "ON" &&
      requestedCommand !== "OFF"
    ) {

      throw new Error(
        "Invalid command in database: " +
        requestedCommand
      );

    }


    // ================================    // Get current REAL status
    // BEFORE updating it
    // ================================
    let currentStatus;

    try {

      currentStatus =
        await getStatus(deviceId);

    } catch (error) {

      console.log(
        `Status unavailable for ${deviceId}: ${error.message}`
      );

      currentStatus = {
        status: "UNKNOWN"
      };

    }


    const previousState =
      String(
        currentStatus?.status || "UNKNOWN"
      ).toUpperCase();


    // ================================    // Mark command completed
    // ================================
    const updated =
      await databases.updateDocument(
        DATABASE_ID,
        COMMAND_COLLECTION,
        commandId,
        {
          executed: true
        }
      );


    // ================================    // UPDATE STATUS
    // ================================
    await updateStatus(
      deviceId,
      requestedCommand
    );


    // ================================    // HISTORY
    //
    // ONLY if state actually changed.
    // ================================
    if (
      previousState !== requestedCommand
    ) {

      await addHistory(
        deviceId,
        requestedCommand,
        "Completed"
      );


      console.log(
        `HISTORY: ${deviceId} ${previousState} -> ${requestedCommand}`
      );

    } else {

      console.log(
        `NO HISTORY: ${deviceId} already ${requestedCommand}`
      );

    }


    return updated;


  } catch (err) {

    console.error(
      "completeCommand Error:",
      err.message
    );

    throw err;

  }

}



// ==================================// EXPORT
// ==================================
module.exports = {

  sendCommand,
  getCommand,
  completeCommand

};
