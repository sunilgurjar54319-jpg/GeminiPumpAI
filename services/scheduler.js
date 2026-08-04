const cron = require("node-cron");
const databases = require("../config/appwrite");
const { sendCommand } = require("./commandService");
const { getStatus } = require("./statusService");
const { Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";


// =========================================
// Execute Scheduled Command
// =========================================

async function executeCommand(deviceId, command) {

  try {

    const result = await sendCommand(deviceId, command, "SCHEDULED");

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

async function cleanupOldOneTimeSchedules() {

  try {

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        [
          Query.limit(1000)
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
      SCHEDULE_COLLECTION
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
          Query.limit(1000)
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
        // Recover ON only once for this schedule
        // during the current date.
        //
        // IMPORTANT:
        // Do NOT expire every pending SCHEDULED ON.
        // Other schedules may belong to the same device.
        // =====================================

        if (
          schedule.command === "ON" &&
          schedule.startTime &&
          schedule.endTime &&
          currentTime >= schedule.startTime &&
          currentTime < schedule.endTime
        ) {

          const recoveryKey =
            `${currentDate}-RECOVERY-${schedule.$id}`;

          // Already recovered this schedule today.
          if (
            schedule.lastExecuted !== recoveryKey
          ) {

            const currentStatus =
              await getStatus(schedule.deviceId);

            if (
              currentStatus &&
              currentStatus.status === "OFF"
            ) {

              console.log(
                `🔄 Power-Cut Recovery: ${schedule.deviceId} → ON`
              );

              const recoveryResult =
                await executeCommand(
                  schedule.deviceId,
                  "ON"
                );

              // Lock only after recovery command was
              // accepted/queued. If it was ignored because
              // another ON is already pending, do not lock.
              if (
                !recoveryResult ||
                recoveryResult.ignored !== true
              ) {

                await databases.updateDocument(
                  DATABASE_ID,
                  SCHEDULE_COLLECTION,
                  schedule.$id,
                  {
                    lastExecuted: recoveryKey
                  }
                );

                console.log(
                  `✅ Recovery ON locked: ` +
                  `${schedule.deviceId} ` +
                  `${currentDate}`
                );

              } else {

                console.log(
                  `ℹ️ Recovery ON not locked: ${
                    recoveryResult.message ||
                    "command already pending"
                  }`
                );

              }

            }

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


            await executeCommand(
              schedule.deviceId,
              command
            );


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


        await executeCommand(
          schedule.deviceId,
          "ON"
        );


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
