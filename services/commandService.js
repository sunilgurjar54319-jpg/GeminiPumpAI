const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");
const { updateStatus, getStatus } = require("./statusService");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COMMAND_COLLECTION = "commands";
// ==================================
// CHECK WHETHER A SCHEDULE IS ACTIVE
// ==================================
async function isScheduleActiveNow(deviceId) {

  const SCHEDULE_COLLECTION = "schedules";

  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const currentDate =
    `${values.year}-${values.month}-${values.day}`;

  const currentTime =
    `${values.hour}:${values.minute}`;

  const dayName =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "long"
    }).format(now);

  const result =
    await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      [
        Query.equal("deviceId", deviceId),
        Query.equal("enabled", true),
        Query.limit(100)
      ]
    );

  for (const schedule of result.documents) {

    if (
      schedule.command !== "ON" ||
      !schedule.startTime ||
      !schedule.endTime
    ) {
      continue;
    }

    // One-time schedule
    if (schedule.scheduledDate) {

      if (
        schedule.scheduledDate === currentDate &&
        currentTime >= schedule.startTime &&
        currentTime < schedule.endTime
      ) {
        return true;
      }

      continue;
    }

    // Recurring schedule
    if (!schedule.days) {
      continue;
    }

    const days = schedule.days
      .split(",")
      .map(day => day.trim());

    if (!days.includes(dayName)) {
      continue;
    }

    if (
      currentTime >= schedule.startTime &&
      currentTime < schedule.endTime
    ) {
      return true;
    }
  }

  return false;
}


// ==================================
// PERSIST MANUAL OVERRIDE — PER DEVICE
// ==================================
async function updateManualOverride(deviceId, command) {

  const normalizedCommand =
    String(command || "").toUpperCase();

  if (
    normalizedCommand !== "ON" &&
    normalizedCommand !== "OFF"
  ) {
    return;
  }

  const devicesCollection =
    process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";

  const result =
    await databases.listDocuments(
      DATABASE_ID,
      devicesCollection,
      [
        Query.equal("deviceId", deviceId),
        Query.limit(1)
      ]
    );

  if (result.documents.length === 0) {
    throw new Error(
      "Device not found while updating manual override: " +
      deviceId
    );
  }

  const device = result.documents[0];

  let manualOverride = false;

  if (normalizedCommand === "OFF") {

    // Manual OFF protection is only valid while an ON schedule
    // is currently active. Outside a schedule, manual OFF must
    // NOT block the next scheduled start.
    manualOverride =
      await isScheduleActiveNow(deviceId);

    console.log(
      `🔎 MANUAL OFF SCHEDULE CHECK: ${deviceId} | ` +
      `active=${manualOverride}`
    );
  }

  await databases.updateDocument(
    DATABASE_ID,
    devicesCollection,
    device.$id,
    {
      isManualOverride: manualOverride
    }
  );

  console.log(
    `🔐 MANUAL OVERRIDE: ${deviceId} -> ${manualOverride}`
  );
}



// ==================================// SEND NEW COMMAND
// ==================================
async function sendCommand(deviceId, command, source = "MANUAL") {

  try {

    command = String(command || "").toUpperCase();

    if (command !== "ON" && command !== "OFF") {
      throw new Error("Invalid command: " + command);
    }


    // =========================================
    // PERSISTENT MANUAL OVERRIDE CHECK
    // =========================================
    // MANUAL OFF  -> isManualOverride = true
    // Schedule END -> isManualOverride = false
    // MANUAL ON   -> isManualOverride = false
    //
    // Only the current device state is checked.
    // Old MANUAL OFF command history does NOT
    // block future schedules.
    // =========================================
    if (
      command === "ON" &&
      source !== "MANUAL"
    ) {

      const devicesCollection =
        process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";

      try {

        const deviceResult =
          await databases.listDocuments(
            DATABASE_ID,
            devicesCollection,
            [
              Query.equal("deviceId", deviceId),
              Query.limit(1)
            ]
          );

        if (!deviceResult.documents.length) {

          console.log(
            `⚠️ Manual override check: device not found | ${deviceId}`
          );

          return {
            ignored: true,
            manualOff: true,
            status: "UNKNOWN",
            message: "Device manual override state could not be verified"
          };
        }

        const device =
          deviceResult.documents[0];

        if (device.isManualOverride === true) {

          console.log(
            `🛑 MANUAL OVERRIDE LOCK: ${deviceId} → ${source} ON blocked`
          );

          return {
            ignored: true,
            manualOff: true,
            status: "OFF",
            message: "Manual OFF protection active"
          };
        }

        console.log(
          `✅ MANUAL OVERRIDE CLEAR: ${deviceId} → ${source} ON allowed`
        );

      } catch (error) {

        console.log(
          `⚠️ Manual override check failed: ${deviceId} | ${error.message}`
        );

        return {
          ignored: true,
          manualOff: true,
          status: "UNKNOWN",
          message: "Manual override state could not be verified"
        };
      }
    }

    // =========================================
    // PERSIST MANUAL OVERRIDE IMMEDIATELY
    // =========================================
    // Manual OFF must activate protection even
    // when the pump is already OFF or another
    // command is pending.
    //
    // Manual ON clears the protection.
    // Scheduled/recovery commands never change it.
    // =========================================
    if (source === "MANUAL") {
      await updateManualOverride(
        deviceId,
        command
      );
    }

    // Get pending commands
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
    // PERSISTENT MANUAL OVERRIDE CHECK
    // ==================================
    // Only the current device state controls
    // whether automatic ON may reach firmware.
    //
    // MANUAL OFF  -> isManualOverride = true
    // Schedule END -> isManualOverride = false
    // MANUAL ON   -> isManualOverride = false
    //
    // Old MANUAL OFF command history is NOT used.
    // ==================================

    const devicesCollection =
      process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";

    let manualOffActive = false;

    try {

      const deviceResult =
        await databases.listDocuments(
          DATABASE_ID,
          devicesCollection,
          [
            Query.equal("deviceId", deviceId),
            Query.limit(1)
          ]
        );

      if (!deviceResult.documents.length) {

        console.log(
          `⚠️ GET COMMAND: device not found | ${deviceId}`
        );

        // Safety-first:
        // Cannot verify manual state, so block automatic ON.
        manualOffActive = true;

      } else {

        const device =
          deviceResult.documents[0];

        manualOffActive =
          device.isManualOverride === true;

        console.log(
          `🔐 GET COMMAND MANUAL OVERRIDE: ${deviceId} | ` +
          `isManualOverride=${manualOffActive}`
        );
      }

    } catch (error) {

      console.log(
        `⚠️ GET COMMAND manual override check failed: ` +
        `${deviceId} | ${error.message}`
      );

      // Safety-first:
      // Cannot verify manual state, so block automatic ON.
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
        `📤 GET COMMAND: ${deviceId} | command=${pendingCommand.command} | source=${pendingCommand.source} | id=${pendingCommand.$id}`
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
