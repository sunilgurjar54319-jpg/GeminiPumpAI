const cron = require("node-cron");
const databases = require("../config/appwrite");
const { sendCommand } = require("./commandService");
const { getStatus } = require("./statusService");
const { Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";
const COMMAND_COLLECTION = "commands";


// =========================================
// Execute Scheduled Command
// =========================================

async function executeCommand(deviceId, command, source = "SCHEDULED") {

  try {

    // =========================================
    // FINAL MANUAL OFF SAFETY GATE
    // =========================================
    // Manual OFF active ho to automatic ON
    // Appwrite command banane se pehle block hoga.
    // =========================================

    if (
      String(command || "").toUpperCase() === "ON" &&
      source !== "MANUAL"
    ) {
      const manualOff = await isManualOffActive(deviceId);

      if (manualOff) {
        console.log(
          `🛑 FINAL MANUAL OFF GATE: ${deviceId} → ${source} ON BLOCKED`
        );

        return {
          ignored: true,
          blocked: true,
          status: "OFF",
          message: "Manual OFF active - automatic ON blocked"
        };
      }
    }

    const result = await sendCommand(
      deviceId,
      command,
      source
    );

    // -----------------------------------------
    // Already in requested state
    // -----------------------------------------
    if (result && result.ignored === true) {

      const ignoredStatus =
        result.status === "ON" || result.status === "OFF"
          ? result.status
          : null;

      if (ignoredStatus) {

        console.log(
          `ℹ️ Command Ignored: Pump already ${ignoredStatus}`
        );

        console.log(
          `${ignoredStatus === "ON" ? "🟢" : "🔴"} ${deviceId} STATUS: ${ignoredStatus}`
        );

      } else {

        console.log(
          `ℹ️ Command Ignored: ${result.message || "command already handled"}`
        );

      }

      return result;
    }

    // -----------------------------------------
    // Command created OR existing pending command
    // -----------------------------------------
    console.log(
      `📤 Scheduled Command Sent: ${command} → ${deviceId}`
    );

    console.log(
      `⏳ Waiting for device to complete: ${command} → ${deviceId}`
    );

    // Device simulator may take a few seconds
    for (let i = 0; i < 15; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 1000)
      );

      try {

        const status = await getStatus(deviceId);

        if (status && status.status) {

          console.log(
            `${status.status === "ON" ? "🟢" : "🔴"} ${deviceId} STATUS: ${status.status}`
          );

          if (status.status === command) {

            console.log(
              `✅ Scheduled ${command} confirmed: ${deviceId}`
            );

            return status;
          }
        }

      } catch (statusError) {

        console.log(
          `⚠️ Status check failed: ${statusError.message}`
        );

      }

    }

    console.log(
      `⚠️ Scheduled ${command} confirmation timeout: ${deviceId}`
    );

    return result;

  } catch (error) {

    console.log(
      `❌ Scheduled ${command} Error:`,
      error.message
    );

    throw error;

  }

}

// =========================================
// India Time
// =========================================

function getIndiaDate() {

  return new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone: "Asia/Kolkata"
      }
    )
  );

}


// =========================================
// Format Date YYYY-MM-DD
// =========================================

function getIndiaDateString(indiaDate) {

  return (
    indiaDate.getFullYear() +
    "-" +
    String(indiaDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(indiaDate.getDate()).padStart(2, "0")
  );

}


// =========================================
// Cleanup Old Completed One-Time Schedules
// =========================================
// Keeps completed one-time schedules for 24 hours,
// then removes them from Appwrite.
// Recurring schedules are never removed.
// =========================================

// =========================================
// MANUAL OFF PROTECTION
// =========================================
async function isManualOffActive(deviceId) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COMMAND_COLLECTION,
      [
        Query.equal("deviceId", deviceId),
        Query.equal("source", "MANUAL"),
        Query.orderDesc("$createdAt"),
        Query.limit(1)
      ]
    );

    if (!result.documents.length) {
      return false;
    }

    const latestManualCommand = result.documents[0];

    return (
      String(latestManualCommand.command || "").toUpperCase() === "OFF"
    );

  } catch (error) {
    console.log(
      `⚠️ Manual OFF check failed: ${deviceId} | ${error.message}`
    );

    // Safety-first:
    // अगर manual state verify नहीं हो सके,
    // तो automatic recovery मत करो.
    return true;
  }
}

async function cleanupOldOneTimeSchedules() {

  try {

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        [
          Query.equal("enabled", false),
          Query.limit(100)
        ]
      );

    const now = Date.now();

    const CLEANUP_AFTER_MS =
      24 * 60 * 60 * 1000;

    for (const schedule of result.documents) {

      // Only cleanup completed one-time schedules.
      if (
        schedule.enabled !== false ||
        !schedule.scheduledDate
      ) {
        continue;
      }

      // Recurring schedules have scheduledDate = null,
      // so they are automatically protected above.

      if (!schedule.$updatedAt) {
        continue;
      }

      const updatedAt =
        new Date(schedule.$updatedAt).getTime();

      if (
        Number.isNaN(updatedAt) ||
        now - updatedAt < CLEANUP_AFTER_MS
      ) {
        continue;
      }

      await databases.deleteDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id
      );

      console.log(
        `🧹 Old One-Time Schedule Deleted: ${schedule.$id}`
      );

    }

  } catch (error) {

    console.log(
      "❌ Schedule Cleanup Error:",
      error.message
    );

  }

}


// =========================================
// Check whether another schedule is currently active
// for the same device.
// Used to prevent one schedule's OFF from stopping
// another overlapping schedule.
// =========================================

async function hasOtherActiveSchedule(
  deviceId,
  currentScheduleId,
  currentDate,
  currentTime,
  today
) {

  try {

    const result = await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      [
        Query.equal("deviceId", deviceId),
        Query.equal("enabled", true),
        Query.limit(100)
      ]
    );

    for (const other of result.documents) {

      if (other.$id === currentScheduleId) {
        continue;
      }

      if (
        other.deviceId !== deviceId ||
        other.enabled !== true ||
        !other.startTime ||
        !other.endTime
      ) {
        continue;
      }

      // -----------------------------------------
      // One-time schedule
      // -----------------------------------------

      if (other.scheduledDate) {

        if (
          other.scheduledDate === currentDate &&
          currentTime >= other.startTime &&
          currentTime < other.endTime
        ) {
          return true;
        }

        continue;
      }

      // -----------------------------------------
      // Recurring schedule
      // -----------------------------------------

      if (!other.days) {
        continue;
      }

      const days = other.days
        .split(",")
        .map(day => day.trim());

      if (!days.includes(today)) {
        continue;
      }

      if (
        currentTime >= other.startTime &&
        currentTime < other.endTime
      ) {
        return true;
      }
    }

    return false;

  } catch (error) {

    console.log(
      "⚠️ Overlap check failed:",
      error.message
    );

    // Safety-first:
    // If overlap check fails, block OFF.
    // Never turn the pump OFF when active-schedule
    // information cannot be verified.
    return true;
  }
}


// =========================================
// Check Schedules
// =========================================

async function checkSchedules() {

  try {

    const indiaDate = getIndiaDate();

    // -----------------------------------------
    // Current Time
    // -----------------------------------------

    const currentTime =
      indiaDate.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );


    // -----------------------------------------
    // Current Date
    // -----------------------------------------

    const currentDate =
      getIndiaDateString(indiaDate);


    // -----------------------------------------
    // Current Day
    // -----------------------------------------

    const dayNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ];

    const today =
      dayNames[indiaDate.getDay()];


    console.log(
      "Scheduler:",
      currentDate,
      today,
      currentTime
    );


    // =========================================
    // Get All Schedules
    // =========================================

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        [
          Query.equal("enabled", true),
          Query.limit(100)
        ]
      );


    // =========================================
    // Process Schedules
    // =========================================

    for (const schedule of result.documents) {


      // ---------------------------------------
      // Disabled
      // ---------------------------------------

      if (!schedule.enabled) {
        continue;
      }

      console.log(
        `🔎 CHECK SCHEDULE: ${schedule.deviceId} | start=${schedule.startTime} | end=${schedule.endTime} | days=${schedule.days} | today=${today} | now=${currentTime} | command=${schedule.command} | last=${schedule.lastExecuted}`
      );


      // =======================================
      // ONE-TIME DATE SCHEDULE
      // =======================================

      if (schedule.scheduledDate) {

        // Wrong date
        if (
          schedule.scheduledDate !==
          currentDate
        ) {
          continue;
        }


        // =====================================
        // POWER-CUT RECOVERY
        // =====================================
        //
        // IMPORTANT:
        // This schedule may have scheduledDate, but while
        // its ON -> OFF window is active, power-cut recovery
        // must remain available.
        //
        // NO recoveryKey.
        // NO once-per-day lock.
        //
        // Every time the actual pump status becomes OFF
        // while this schedule is active, a fresh ON command
        // can be created.
        //
        // UNKNOWN status is never forced to ON.
        // =====================================

        if (
          schedule.command === "ON" &&
          schedule.startTime &&
          schedule.endTime &&
          currentTime >= schedule.startTime &&
          currentTime < schedule.endTime
        ) {

          const currentStatus =
            await getStatus(schedule.deviceId);

          console.log(
            `🔎 POWER-CUT RECOVERY CHECK: ` +
            `${schedule.deviceId} | ` +
            `window=${schedule.startTime}-${schedule.endTime} | ` +
            `now=${currentTime} | ` +
            `status=${currentStatus ? currentStatus.status : "UNKNOWN"}`
          );

          if (
            currentStatus &&
            currentStatus.status === "OFF"
          ) {

            const manualOffActive =
              await isManualOffActive(schedule.deviceId);

            if (manualOffActive) {
              console.log(
                `🛑 MANUAL OFF PROTECTION: ${schedule.deviceId} → recovery blocked`
              );
              continue;
            }

            console.log(
              `🔄 POWER-CUT RECOVERY: ` +
              `${schedule.deviceId} → ON`
            );

            try {
              const recoveryResult = await executeCommand(
                schedule.deviceId,
                "ON"
              );

              if (recoveryResult && recoveryResult.ignored === true) {
                console.log(
                  `ℹ️ POWER-CUT RECOVERY SKIPPED: ` +
                  `${schedule.deviceId} | ` +
                  `${recoveryResult.message || "command already pending"}`
                );
              } else {
                console.log(
                  `✅ POWER-CUT RECOVERY ON: ` +
                  `${schedule.deviceId}`
                );
              }
            } catch (recoveryError) {
              console.log(
                `❌ POWER-CUT RECOVERY ERROR: ` +
                `${schedule.deviceId} | ` +
                `${recoveryError.message}`
              );
            }
          } else if (
            currentStatus &&
            currentStatus.status === "ON"
          ) {

            console.log(
              `🟢 POWER-CUT RECOVERY NOT REQUIRED: ` +
              `${schedule.deviceId} already ON`
            );

          } else {

            console.log(
              `⚠️ POWER-CUT RECOVERY WAITING: ` +
              `${schedule.deviceId} status is UNKNOWN`
            );

          }

        }

        // =====================================
        // START / ON or one-time command
        // =====================================

        if (
          schedule.startTime ===
          currentTime
        ) {

          const executionKey =
            `${currentDate}-${currentTime}-START-${schedule.$id}`;


          if (
            schedule.lastExecuted !==
            executionKey
          ) {

            let command =
              schedule.command;

            if (
              command !== "ON" &&
              command !== "OFF"
            ) {
              command = "ON";
            }


            if (
              command === "ON" &&
              await isManualOffActive(schedule.deviceId)
            ) {
              console.log(
                `🛑 MANUAL OFF PROTECTION: ${schedule.deviceId} → scheduled START blocked`
              );
            } else {
              await executeCommand(
                schedule.deviceId,
                command
              );
            }


            // If start and end are the same,
            // this is a true one-time schedule.
            if (
              !schedule.endTime ||
              schedule.endTime ===
              schedule.startTime
            ) {

              await databases.updateDocument(
                DATABASE_ID,
                SCHEDULE_COLLECTION,
                schedule.$id,
                {
                  lastExecuted: executionKey,
                  enabled: false
                }
              );

            } else {

              // Keep enabled until OFF time.
              await databases.updateDocument(
                DATABASE_ID,
                SCHEDULE_COLLECTION,
                schedule.$id,
                {
                  lastExecuted: executionKey
                }
              );

            }


            console.log(
              `✅ One-Time Scheduled ${command}:`,
              schedule.deviceId,
              currentDate,
              currentTime
            );

          }

          continue;
        }


        // =====================================
        // END / OFF
        // =====================================

        if (
          schedule.endTime &&
          currentTime >= schedule.endTime &&
          schedule.endTime !==
          schedule.startTime
        ) {

          const executionKey =
            `${currentDate}-${currentTime}-END-${schedule.$id}`;


          if (
            schedule.lastExecuted ===
            executionKey
          ) {
            continue;
          }


          const anotherScheduleActive =
            await hasOtherActiveSchedule(
              schedule.deviceId,
              schedule.$id,
              currentDate,
              currentTime,
              today
            );

          if (anotherScheduleActive) {

            console.log(
              `⏸️ Scheduled OFF skipped: ${schedule.deviceId} still covered by another active schedule`
            );

          } else {

            await executeCommand(
              schedule.deviceId,
              "OFF"
            );

          }


          await databases.updateDocument(
            DATABASE_ID,
            SCHEDULE_COLLECTION,
            schedule.$id,
            {
              lastExecuted: executionKey,
              enabled: false
            }
          );


          console.log(
            `✅ One-Time Scheduled OFF: ${schedule.deviceId} ${currentDate} ${currentTime}`
          );


          continue;
        }


        continue;
      }


      // =======================================
      // RECURRING SCHEDULE
      // =======================================

      if (
        !schedule.days ||
        !schedule.days
          .split(",")
          .map(day => day.trim())
          .includes(today)
      ) {
        continue;
      }


      // =======================================
      // RECURRING POWER-CUT RECOVERY
      // =======================================
      //
      // Schedule active है और actual status OFF है
      // तो pump को वापस ON किया जाएगा।
      //
      // IMPORTANT:
      // - कोई once-per-day lock नहीं
      // - कोई recoveryKey नहीं
      // - कितनी भी बार power cut हो सकता है
      // - हर recovery के बाद फिर OFF मिलने पर ON होगा
      // - schedule के बाहर कभी recovery नहीं होगी
      // =======================================

      if (
      schedule.command === "ON" &&
        schedule.startTime &&
        schedule.endTime &&
        currentTime >= schedule.startTime &&
        currentTime < schedule.endTime
      ) {

        const currentStatus =
          await getStatus(schedule.deviceId);

        console.log(
          `🔎 RECOVERY CHECK: ${schedule.deviceId} | ` +
          `schedule=${schedule.startTime}-${schedule.endTime} | ` +
          `now=${currentTime} | ` +
          `status=${currentStatus ? currentStatus.status : "UNKNOWN"}`
        );

        // ---------------------------------------
        // PUMP OFF = POWER-CUT RECOVERY REQUIRED
        // ---------------------------------------

        if (
          currentStatus &&
          currentStatus.status === "OFF"
        ) {

          const manualOffActive =
            await isManualOffActive(schedule.deviceId);

          if (manualOffActive) {
            console.log(
              `🛑 MANUAL OFF PROTECTION: ${schedule.deviceId} → recovery blocked`
            );
            continue;
          }

          console.log(
            `🔄 POWER-CUT RECOVERY: ` +
            `${schedule.deviceId} → ON`
          );

          try {

            const recoveryResult =
              await executeCommand(
                schedule.deviceId,
                "ON"
              );

            // -----------------------------------
            // Already pending / already handled
            // -----------------------------------

            if (
              recoveryResult &&
              recoveryResult.ignored === true
            ) {

              console.log(
                `ℹ️ POWER-CUT RECOVERY SKIPPED: ` +
                `${schedule.deviceId} | ` +
                `${recoveryResult.message || "command already pending"}`
              );

            } else {

              console.log(
                `✅ POWER-CUT RECOVERY SUCCESS: ` +
                `${schedule.deviceId} → ON`
              );

            }

          } catch (recoveryError) {

            console.log(
              `❌ POWER-CUT RECOVERY ERROR: ` +
              `${schedule.deviceId} | ` +
              `${recoveryError.message}`
            );

          }

        } else if (
          currentStatus &&
          currentStatus.status === "ON"
        ) {

          console.log(
            `🟢 POWER-CUT RECOVERY NOT REQUIRED: ` +
            `${schedule.deviceId} already ON`
          );

        } else {

          // UNKNOWN को ON नहीं करेंगे।
          // इससे communication failure में pump
          // accidentally start नहीं होगा।

          console.log(
            `⚠️ POWER-CUT RECOVERY WAITING: ` +
            `${schedule.deviceId} status is UNKNOWN`
          );

        }

      }


      // =======================================
      // START / ON
      // =======================================

      if (
        schedule.startTime ===
        currentTime
      ) {

        const executionKey =
          `${currentDate}-${currentTime}-START-${schedule.$id}`;


        if (
          schedule.lastExecuted ===
          executionKey
        ) {
          continue;
        }


        if (await isManualOffActive(schedule.deviceId)) {
          console.log(
            `🛑 MANUAL OFF PROTECTION: ${schedule.deviceId} → recurring scheduled START blocked`
          );
        } else {
          await executeCommand(
            schedule.deviceId,
            "ON"
          );
        }


        await databases.updateDocument(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          schedule.$id,
          {
            lastExecuted: executionKey
          }
        );


        console.log(
          `✅ Scheduled ON: ${schedule.deviceId} ${currentDate} ${currentTime}`
        );


        continue;
      }


      // =======================================
      // END / OFF
      // =======================================

      if (
        schedule.endTime &&
        schedule.endTime ===
        currentTime &&
        schedule.endTime !==
        schedule.startTime
      ) {

        const executionKey =
          `${currentDate}-${currentTime}-END-${schedule.$id}`;


        if (
          schedule.lastExecuted ===
          executionKey
        ) {
          continue;
        }


        const anotherScheduleActive =
          await hasOtherActiveSchedule(
            schedule.deviceId,
            schedule.$id,
            currentDate,
            currentTime,
            today
          );

        if (anotherScheduleActive) {

          console.log(
            `⏸️ Scheduled OFF skipped: ${schedule.deviceId} still covered by another active schedule`
          );

        } else {

          await executeCommand(
            schedule.deviceId,
            "OFF"
          );

        }


        await databases.updateDocument(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          schedule.$id,
          {
            lastExecuted: executionKey
          }
        );


        console.log(
          `✅ Scheduled OFF: ${schedule.deviceId} ${currentDate} ${currentTime}`
        );


        continue;
      }

    }


  } catch (error) {

    console.log(
      "❌ Scheduler Error:",
      error.message
    );

  }

}


// =========================================
// Run Every Minute
// =========================================

cron.schedule(
  "* * * * *",
  checkSchedules,
  {
    timezone: "Asia/Kolkata"
  }
);


// =========================================
// Cleanup Old One-Time Schedules
// Run once every hour
// =========================================

cron.schedule(
  "0 * * * *",
  cleanupOldOneTimeSchedules,
  {
    timezone: "Asia/Kolkata"
  }
);


// =========================================
// Export
// =========================================

module.exports = {
  checkSchedules
};
