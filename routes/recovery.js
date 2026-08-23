const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";
const COMMAND_COLLECTION = "commands";


// =========================================
// India Time
// =========================================

function getIndiaDate() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    })
  );
}


// =========================================
// Date YYYY-MM-DD
// =========================================

function getIndiaDateString(date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}


// =========================================
// Time HH:MM
// =========================================

function getTimeString(date) {
  return (
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}


// =========================================
// Recurring Schedule
// =========================================

function isRecurringActive(schedule, currentDate, currentTime) {

  if (!schedule.enabled) return false;
  if (!schedule.days) return false;
  if (!schedule.startTime) return false;

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];

  const today = dayNames[currentDate.getDay()];

  const days = schedule.days
    .split(",")
    .map(day => day.trim());

  if (!days.includes(today)) return false;


  // No end time
  if (!schedule.endTime) {
    return currentTime >= schedule.startTime;
  }


  // Normal same-day schedule
  if (schedule.startTime < schedule.endTime) {
    return (
      currentTime >= schedule.startTime &&
      currentTime < schedule.endTime
    );
  }


  // Overnight schedule
  if (schedule.startTime > schedule.endTime) {
    return (
      currentTime >= schedule.startTime ||
      currentTime < schedule.endTime
    );
  }

  return false;
}


// =========================================
// One-Time Schedule
// =========================================

function isOneTimeActive(schedule, currentDate, currentTime) {

  if (!schedule.enabled) return false;
  if (!schedule.scheduledDate) return false;
  if (!schedule.startTime) return false;

  const currentDateString =
    getIndiaDateString(currentDate);

  if (schedule.scheduledDate !== currentDateString) {
    return false;
  }


  // No end time
  if (!schedule.endTime) {
    return currentTime >= schedule.startTime;
  }


  // Normal same-day schedule
  if (schedule.startTime < schedule.endTime) {
    return (
      currentTime >= schedule.startTime &&
      currentTime < schedule.endTime
    );
  }


  // Overnight schedule
  if (schedule.startTime > schedule.endTime) {
    return (
      currentTime >= schedule.startTime ||
      currentTime < schedule.endTime
    );
  }

  return false;
}


// =========================================
// Clear Pending Commands
// =========================================

async function clearPendingCommands(deviceId) {

  let cleared = 0;

  const result = await databases.listDocuments(
    DATABASE_ID,
    COMMAND_COLLECTION,
    [
      Query.equal("deviceId", deviceId),
      Query.equal("executed", false)
    ]
  );


  for (const command of result.documents) {

    await databases.updateDocument(
      DATABASE_ID,
      COMMAND_COLLECTION,
      command.$id,
      {
        executed: true
      }
    );

    cleared++;

    console.log(
      `Recovery cleared pending command: ${command.command}`
    );
  }

  return cleared;
}


// =========================================
// Recovery API
// =========================================

router.get("/:deviceId", async (req, res) => {

  try {

    const deviceId = req.params.deviceId;

    const now = getIndiaDate();

    const currentDate =
      getIndiaDateString(now);

    const currentTime =
      getTimeString(now);


    console.log(
      `Recovery Check: ${deviceId} | ${currentDate} ${currentTime}`
    );


    // =====================================
    // Get schedules
    // =====================================

    const result = await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      [
        Query.equal("deviceId", deviceId)
      ]
    );


    let shouldBeON = false;


    // =====================================
    // Determine required state
    // =====================================

    for (const schedule of result.documents) {

      if (!schedule.enabled) {
        continue;
      }


      // One-time schedule
      if (schedule.scheduledDate) {

        if (
          isOneTimeActive(
            schedule,
            now,
            currentTime
          )
        ) {
          shouldBeON = true;
          break;
        }

        continue;
      }


      // Recurring schedule
      if (
        isRecurringActive(
          schedule,
          now,
          currentTime
        )
      ) {
        shouldBeON = true;
        break;
      }

    }


    // =====================================
    // MANUAL OFF SAFETY LOCK
    // =====================================
    // If the latest manual command is OFF,
    // recovery must NEVER return ON.
    // =====================================

    let manualOffActive = false;

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
        manualOffActive = true;
      }

    } catch (error) {

      console.log(
        `⚠️ Recovery manual OFF check failed: ${deviceId} | ${error.message}`
      );

      // Safety-first:
      // If manual state cannot be verified,
      // recovery must not turn the pump ON.
      manualOffActive = true;
    }

    const command =
      manualOffActive
        ? "OFF"
        : (shouldBeON ? "ON" : "OFF");

    if (manualOffActive) {

      console.log(
        `🛑 RECOVERY MANUAL OFF LOCK: ${deviceId} → OFF`
      );

    }


    // =====================================
    // Clear old pending commands
    // =====================================

    const clearedCommands =
      await clearPendingCommands(deviceId);


    // =====================================
    // IMPORTANT:
    // Recovery does NOT create History.
    //
    // History is created only when
    // completeCommand() records a real
    // ON/OFF command completion.
    // =====================================


    console.log(
      `Recovery Result: ${deviceId} -> ${command}`
    );


    res.json({

      success: true,
      deviceId,
      command,
      date: currentDate,
      time: currentTime,
      recovery: true,
      clearedCommands

    });


  } catch (error) {

    console.error(
      "Recovery Error:",
      error.message
    );


    res.status(500).json({

      success: false,
      error: error.message

    });

  }

});


module.exports = router;
