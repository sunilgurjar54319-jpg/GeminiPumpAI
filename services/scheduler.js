const cron = require("node-cron");
const databases = require("../config/appwrite");
const { sendCommand } = require("./commandService");

const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID;

const SCHEDULE_COLLECTION =
  "schedules";


// =========================================
// Execute Scheduled Command
// =========================================

async function executeCommand(
  deviceId,
  command
) {

  try {

    await sendCommand(
      deviceId,
      command
    );

    console.log(
      `📤 Scheduled Command Sent: ${command} → ${deviceId}`
    );

  } catch (error) {

    console.log(
      "❌ Scheduled Command Error:",
      error.message
    );

  }

}


// =========================================
// Get India Date
// =========================================

function getIndiaDate() {

  const now = new Date();

  return new Date(
    now.toLocaleString(
      "en-US",
      {
        timeZone: "Asia/Kolkata"
      }
    )
  );

}


// =========================================
// Check Schedules
// =========================================

async function checkSchedules() {

  try {

    const indiaDate =
      getIndiaDate();


    // =======================================
    // Current Time
    // =======================================

    const currentTime =
      indiaDate.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );


    // =======================================
    // Current Date
    // =======================================

    const currentDate =
      indiaDate.getFullYear() +
      "-" +
      String(
        indiaDate.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        indiaDate.getDate()
      ).padStart(2, "0");


    // =======================================
    // Current Day
    // =======================================

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
      dayNames[
        indiaDate.getDay()
      ];


    console.log(
      "Scheduler:",
      currentDate,
      today,
      currentTime
    );


    // =======================================
    // Get Schedules
    // =======================================

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION
      );


    // =======================================
    // Process Every Schedule
    // =======================================

    for (
      const schedule of result.documents
    ) {


      // =====================================
      // Disabled Schedule
      // =====================================

      if (!schedule.enabled) {
        continue;
      }


      // =====================================
      // Already Executed
      // =====================================

      const lastExecuted =
        schedule.lastExecuted || "";


      const executionKey =
        `${currentDate}-${currentTime}-${schedule.$id}`;


      if (
        lastExecuted ===
        executionKey
      ) {

        continue;

      }


      // =====================================
      // ONE-TIME DATE SCHEDULE
      // =====================================

      if (
        schedule.scheduledDate
      ) {


        // -----------------------------------
        // Wrong Date
        // -----------------------------------

        if (
          schedule.scheduledDate !==
          currentDate
        ) {

          continue;

        }


        // -----------------------------------
        // Wrong Time
        // -----------------------------------

        if (
          schedule.startTime !==
          currentTime
        ) {

          continue;

        }


        // -----------------------------------
        // Command
        // -----------------------------------

        let command =
          schedule.command;


        if (
          command !== "ON" &&
          command !== "OFF"
        ) {

          command = "ON";

        }


        // -----------------------------------
        // Send Command
        // -----------------------------------

        await executeCommand(
          schedule.deviceId,
          command
        );


        // -----------------------------------
        // Mark Schedule Executed
        // -----------------------------------

        await databases.updateDocument(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          schedule.$id,
          {
            lastExecuted:
              executionKey,

            enabled: false
          }
        );


        console.log(
          `✅ One-Time Scheduled ${command}:`,
          schedule.deviceId,
          schedule.scheduledDate
        );


        continue;

      }


      // =====================================
      // RECURRING / NORMAL SCHEDULE
      // =====================================

      if (
        !schedule.days ||
        !schedule.days
          .split(",")
          .includes(today)
      ) {

        continue;

      }


      let command = null;


      // =====================================
      // Explicit ON Command
      // =====================================

      if (
        schedule.command === "ON" &&
        schedule.startTime ===
        currentTime
      ) {

        command = "ON";

      }


      // =====================================
      // Explicit OFF Command
      // =====================================

      else if (
        schedule.command === "OFF" &&
        schedule.startTime ===
        currentTime
      ) {

        command = "OFF";

      }


      // =====================================
      // Normal Start Schedule
      // =====================================

      else if (
        !schedule.command &&
        schedule.startTime ===
        currentTime
      ) {

        command = "ON";

      }


      // =====================================
      // Normal End Schedule
      // =====================================

      else if (
        !schedule.command &&
        schedule.endTime ===
        currentTime &&
        schedule.endTime !==
        schedule.startTime
      ) {

        command = "OFF";

      }


      // =====================================
      // Nothing To Execute
      // =====================================

      if (!command) {

        continue;

      }


      // =====================================
      // Send Scheduled Command
      // =====================================

      await executeCommand(
        schedule.deviceId,
        command
      );


      // =====================================
      // Save Execution Key
      // =====================================

      await databases.updateDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id,
        {
          lastExecuted:
            executionKey
        }
      );


      console.log(
        `✅ Scheduled ${command}:`,
        schedule.deviceId
      );

    }


  } catch (error) {

    console.log(
      "Scheduler Error:",
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
    timezone:
      "Asia/Kolkata"
  }
);


// =========================================
// Export
// =========================================

module.exports = {
  checkSchedules
};
