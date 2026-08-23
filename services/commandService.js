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


    // =========================================
    // CENTRAL MANUAL OFF SAFETY LOCK
    // =========================================
    // Latest MANUAL OFF blocks every automatic ON.
    // A later MANUAL ON automatically releases the lock.
    // =========================================
    if (
      command === "ON" &&
      source !== "MANUAL"
    ) {

      try {

        const latestManual =
          await databases.listDocuments(
            DATABASE_ID,
            COMMAND_COLLECTION,
            [
              Query.equal("deviceId", deviceId),
              Query.equal("source", "MANUAL"),
              Query.orderDesc("$createdAt"),
              Query.limit(1)
            ]
          );

        if (
          latestManual.documents.length > 0 &&
          String(
            latestManual.documents[0].command || ""
          ).toUpperCase() === "OFF"
        ) {

          console.log(
            `🛑 CENTRAL MANUAL OFF LOCK: ${deviceId} → ${source} ON blocked`
          );

          return {
            ignored: true,
            manualOff: true,
            status: "OFF",
            message: "Manual OFF protection active"
          };
        }

      } catch (error) {

        console.log(
          `⚠️ Central manual OFF check failed: ${deviceId} | ${error.message}`
        );

        // Safety-first:
        // If manual state cannot be verified,
        // do not allow automatic ON.
        return {
          ignored: true,
          manualOff: true,
          status: "UNKNOWN",
          message: "Manual OFF state could not be verified"
        };
      }
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
          manualOff: source === "MANUAL" && command === "OFF",
          createdAt: new Date().toISOString()
        }
      );


    console.log(
      `Command Queued: ${command} -> ${deviceId} | source=${source}`
    );

    if (String(command).toUpperCase() === "ON") {
      console.log(
        `🚨 ON COMMAND CREATED: ${deviceId} | source=${source}`
      );
      console.trace("ON command call stack");
    }


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


    // ==================================
    // MANUAL OFF PROTECTION AT DEVICE QUEUE
    // ==================================
    // Latest MANUAL OFF must also block any
    // already-queued automatic SCHEDULED ON.
    // This is the final protection before the
    // command is delivered to the device.
    // ==================================
    let manualOffActive = false;

    try {
      const latestManual = await databases.listDocuments(
        DATABASE_ID,
        COMMAND_COLLECTION,
        [
          Query.equal("deviceId", deviceId),
          Query.equal("source", "MANUAL"),
          Query.orderDesc("$createdAt"),
          Query.limit(1)
        ]
      );

      if (latestManual.documents.length > 0) {
        manualOffActive =
          String(
            latestManual.documents[0].command || ""
          ).toUpperCase() === "OFF";
      }
    } catch (error) {
      console.log(
        `⚠️ GET COMMAND manual OFF check failed: ${deviceId} | ${error.message}`
      );

      // Safety-first: if manual state cannot be verified,
      // do NOT allow an automatic ON to reach the device.
      manualOffActive = true;
    }
    for (const pendingCommand of result.documents) {

      // ==================================
      // BLOCK QUEUED AUTOMATIC ON
      // ==================================
      // ==================================
      // BLOCK QUEUED AUTOMATIC ON
      // ==================================
      //
      // Latest MANUAL OFF blocks ALL automatic ON.
      // MANUAL ON is still allowed.
      // ==================================

      if (
        manualOffActive &&
        String(pendingCommand.command || "").toUpperCase() === "ON" &&
        pendingCommand.source !== "MANUAL"
      ) {
        await databases.updateDocument(
          DATABASE_ID,
          COMMAND_COLLECTION,
          pendingCommand.$id,
          {
            executed: true
          }
        );

        console.log(
          `🛑 GET COMMAND MANUAL OFF LOCK: ${deviceId} → automatic ON blocked | source=${pendingCommand.source} | ${pendingCommand.$id}`
        );

        continue;
      }

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

      console.log(
        `📤 GET COMMAND: ${deviceId} | command=${pendingCommand.command} | source=${pendingCommand.source} | manualOff=${pendingCommand.manualOff} | id=${pendingCommand.$id}`
      );

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
