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

    // WebSocket command completion handles the device result.
    // Do not poll Appwrite status after every scheduled command.
    console.log(
      `📡 Scheduled ${command} handed off to command system: ${deviceId}`
    );

    return result;

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

// =========================================
// CLEAR MANUAL OVERRIDE
// =========================================
// Called when the schedule that was being
// manually overridden reaches its END.
//
// This allows the next schedule to operate normally.
// =========================================
async function clearManualOverride(deviceId) {

  try {

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

    if (!result.documents.length) {
      console.log(
        `⚠️ Manual override reset: device not found | ${deviceId}`
      );
      return;
    }

    const device = result.documents[0];

    // IMPORTANT:
    // Never clear the manual-OFF lock just because ONE schedule ended.
    // The lock belongs to the DEVICE and remains active while ANY
    // ON schedule is currently active for this device.
    const stillActive =
      await hasAnyActiveOnSchedule(deviceId);

    if (stillActive) {

      console.log(
        `🔒 MANUAL OFF LOCK KEPT: ${deviceId} | another ON schedule is active`
      );

      if (device.isManualOverride !== true) {
        await databases.updateDocument(
          DATABASE_ID,
          devicesCollection,
          device.$id,
          {
            isManualOverride: true
          }
        );
      }

      return;
    }

    if (device.isManualOverride !== true) {
      return;
    }

    await databases.updateDocument(
      DATABASE_ID,
      devicesCollection,
      device.$id,
      {
        isManualOverride: false
      }
    );

    console.log(
      `🔓 MANUAL OVERRIDE RESET: ${deviceId} -> false | no active ON schedule`
    );

  } catch (error) {

    console.log(
      `⚠️ Manual override reset failed: ${deviceId} | ${error.message}`
    );

  }
}


// =========================================
// CENTRAL ACTIVE ON-SCHEDULE CHECK
// =========================================
async function hasAnyActiveOnSchedule(deviceId) {

  try {

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
        weekday: "short"
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

      if (!schedule.days) {
        continue;
      }

      const days =
        schedule.days
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

  } catch (error) {

    console.log(
      `⚠️ Active ON schedule check failed: ${deviceId} | ${error.message}`
    );

    // Safety-first: if active schedule state cannot be verified,
    // do NOT clear the manual-OFF protection.
    return true;
  }
}

async function isManualOffActive(deviceId) {

  try {

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

    if (!result.documents.length) {

      console.log(
        `⚠️ MANUAL OVERRIDE CHECK: device not found | ${deviceId}`
      );

      // Safety-first:
      // Cannot verify device state, so automatic ON is blocked.
      return true;
    }

    const device = result.documents[0];

    const manualOverride =
      device.isManualOverride === true;

    // -------------------------------------------------
    // CENTRAL RULE:
    // Manual-OFF lock is valid ONLY while at least
    // one ON schedule is currently active for this
    // device.
    // -------------------------------------------------

    if (!manualOverride) {

      console.log(
        `🔓 MANUAL OVERRIDE CHECK: ${deviceId} | lock=false`
      );

      return false;
    }

    const activeOnSchedule =
      await hasAnyActiveOnSchedule(deviceId);

    if (activeOnSchedule) {

      console.log(
        `🔒 MANUAL OFF LOCK ACTIVE: ${deviceId} | ` +
        `manualOverride=true | activeOnSchedule=true`
      );

      return true;
    }

    // -------------------------------------------------
    // STALE LOCK SELF-HEAL
    //
    // Manual-OFF lock exists in device state, but no
    // ON schedule is active anymore. Clear it now so
    // future schedules/recovery are not affected.
    // -------------------------------------------------

    await databases.updateDocument(
      DATABASE_ID,
      devicesCollection,
      device.$id,
      {
        isManualOverride: false
      }
    );

    console.log(
      `🔓 STALE MANUAL OFF LOCK CLEARED: ${deviceId} | ` +
      `manualOverride=true but no active ON schedule`
    );

    return false;

  } catch (error) {

    console.log(
      `⚠️ Manual override check failed: ${deviceId} | ${error.message}`
    );

    // Safety-first:
    // If the lock/schedule state cannot be verified,
    // automatic ON must NOT be allowed.
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


            await clearManualOverride(schedule.deviceId);
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


          await clearManualOverride(schedule.deviceId);
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


// ========================================================
// EVENT-BASED SCHEDULER
// No global every-minute Appwrite polling.
// Schedules are loaded once at startup and refreshed when
// a schedule is created, updated, enabled/disabled, deleted.
// ========================================================

const scheduleTasks = new Map();

function destroyScheduleTasks(scheduleId) {
  const tasks = scheduleTasks.get(scheduleId);
  if (!tasks) return;

  for (const task of tasks) {
    try {
      if (task && typeof task.destroy === "function") {
        task.destroy();
      } else if (task) {
        clearTimeout(task);
      }
    } catch (error) {
      console.error(
        `[SCHEDULER] Task cleanup failed: ${scheduleId} | ${error.message}`
      );
    }
  }

  scheduleTasks.delete(scheduleId);
}

function addScheduleTask(scheduleId, task) {
  if (!scheduleTasks.has(scheduleId)) {
    scheduleTasks.set(scheduleId, []);
  }

  scheduleTasks.get(scheduleId).push(task);
}

async function runScheduledEvent(scheduleId, eventType) {
  try {
    const schedule = await databases.getDocument(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      scheduleId
    );

    if (!schedule || schedule.enabled !== true) {
      return;
    }

    const now = getIndiaDate();
    const currentDate = getIndiaDateString(now);
    const currentTime = getTimeString(now);

    const isOneTime = Boolean(schedule.scheduledDate);

    if (isOneTime && schedule.scheduledDate !== currentDate) {
      return;
    }

    const executionKey =
      `${currentDate}_${eventType}_${schedule.startTime || ""}_${schedule.endTime || ""}`;

    if (schedule.lastExecuted === executionKey) {
      return;
    }

    if (eventType === "START") {
      const manualOff = await isManualOffActive(schedule.deviceId);

      if (manualOff) {
        console.log(
          `[SCHEDULER] START blocked by manual OFF: ${schedule.deviceId}`
        );
        return;
      }

      await executeCommand(
        schedule.deviceId,
        "ON",
        "SCHEDULED"
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
        `[SCHEDULER] START executed: ${schedule.deviceId} | ${currentDate} ${currentTime}`
      );

      // One-time schedule without an end time is finished after START.
      if (isOneTime && !schedule.endTime) {
        await databases.updateDocument(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          schedule.$id,
          {
            enabled: false
          }
        );

        destroyScheduleTasks(schedule.$id);
      }

      return;
    }

    if (eventType === "END") {
      const anotherScheduleActive = await hasOtherActiveSchedule(
        schedule.deviceId,
        schedule.$id,
        currentDate,
        currentTime,
        [
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat"
        ][now.getDay()]
      );

      if (!anotherScheduleActive) {
        await executeCommand(
          schedule.deviceId,
          "OFF",
          "SCHEDULED"
        );
      } else {
        console.log(
          `[SCHEDULER] OFF skipped; another schedule is active: ${schedule.deviceId}`
        );
      }

      await databases.updateDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id,
        {
          lastExecuted: executionKey,
          ...(isOneTime ? { enabled: false } : {})
        }
      );

      await clearManualOverride(schedule.deviceId);

      if (isOneTime) {
        destroyScheduleTasks(schedule.$id);
      }

      console.log(
        `[SCHEDULER] END processed: ${schedule.deviceId} | ${currentDate} ${currentTime}`
      );
    }

  } catch (error) {
    console.error(
      `[SCHEDULER] Event failed: ${scheduleId} ${eventType} | ${error.message}`
    );
  }
}

function scheduleOneTimeEvent(schedule, eventType, time) {
  if (!schedule.scheduledDate || !time) return;

  const target = new Date(
    `${schedule.scheduledDate}T${time}:00+05:30`
  );

  const delay = target.getTime() - Date.now();

  // Already passed: do not create a continuous polling loop.
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    runScheduledEvent(schedule.$id, eventType);
  }, delay);

  addScheduleTask(schedule.$id, timer);

  console.log(
    `[SCHEDULER] One-time ${eventType} scheduled: ${schedule.$id} -> ${target.toISOString()}`
  );
}

function scheduleRecurringEvent(schedule, eventType, time) {
  if (!time || !schedule.days) return;

  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    console.error(
      `[SCHEDULER] Invalid time: ${schedule.$id} | ${time}`
    );
    return;
  }

  const dayMap = {
    Sun: "0",
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6"
  };

  const cronDays = schedule.days
    .split(",")
    .map(day => day.trim())
    .filter(day => dayMap[day])
    .map(day => dayMap[day])
    .join(",");

  if (!cronDays) return;

  const expression = `${minute} ${hour} * * ${cronDays}`;

  const task = cron.schedule(
    expression,
    () => {
      runScheduledEvent(schedule.$id, eventType);
    },
    {
      timezone: "Asia/Kolkata",
      noOverlap: true
    }
  );

  addScheduleTask(schedule.$id, task);

  console.log(
    `[SCHEDULER] Recurring ${eventType} scheduled: ${schedule.$id} -> ${expression}`
  );
}

function scheduleDocument(schedule) {
  if (!schedule || !schedule.$id || schedule.enabled !== true) {
    return;
  }

  destroyScheduleTasks(schedule.$id);

  if (schedule.scheduledDate) {
    scheduleOneTimeEvent(
      schedule,
      "START",
      schedule.startTime
    );

    scheduleOneTimeEvent(
      schedule,
      "END",
      schedule.endTime
    );

    return;
  }

  scheduleRecurringEvent(
    schedule,
    "START",
    schedule.startTime
  );

  scheduleRecurringEvent(
    schedule,
    "END",
    schedule.endTime
  );
}

async function refreshSchedule(scheduleId) {
  try {
    destroyScheduleTasks(scheduleId);

    const schedule = await databases.getDocument(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      scheduleId
    );

    if (schedule.enabled === true) {
      scheduleDocument(schedule);
    }

    console.log(
      `[SCHEDULER] Schedule refreshed: ${scheduleId}`
    );

    return schedule;
  } catch (error) {
    console.error(
      `[SCHEDULER] Refresh failed: ${scheduleId} | ${error.message}`
    );
    return null;
  }
}

async function removeSchedule(scheduleId) {
  destroyScheduleTasks(scheduleId);

  console.log(
    `[SCHEDULER] Schedule removed: ${scheduleId}`
  );
}

async function initializeScheduler() {
  try {
    console.log("[SCHEDULER] Initializing event-based scheduler...");

    const result = await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      [
        Query.equal("enabled", true),
        Query.limit(100)
      ]
    );

    for (const schedule of result.documents) {
      scheduleDocument(schedule);
    }

    // Cleanup happens once at startup, not every hour.
    await cleanupOldOneTimeSchedules();

    console.log(
      `[SCHEDULER] Ready: ${result.documents.length} active schedule(s)`
    );

  } catch (error) {
    console.error(
      `[SCHEDULER] Initialization failed: ${error.message}`
    );
  }
}

// Start once when the backend starts.
setImmediate(initializeScheduler);

module.exports = {
  checkSchedules,
  initializeScheduler,
  refreshSchedule,
  removeSchedule
};
