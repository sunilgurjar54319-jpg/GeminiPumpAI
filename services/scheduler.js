const cron = require("node-cron");
const databases = require("../config/appwrite");
const {
  sendCommand,
  completeCommand
} = require("./commandService");

const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID;

const SCHEDULE_COLLECTION =
  "schedules";


// =========================================
// Execute Command
// =========================================

async function executeCommand(
  deviceId,
  command
) {

  const cmd =
    await sendCommand(
      deviceId,
      command
    );

  if (
    cmd &&
    cmd.$id &&
    !cmd.executed
  ) {

    await completeCommand(
      cmd.$id
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
        timeZone:
          "Asia/Kolkata"
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


    // Current time
    const currentTime =
      indiaDate.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );


    // Current date
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


    // Current day
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


    // =========================================
    // Get Schedules
    // =========================================

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION
      );


    for (
      const schedule of result.documents
    ) {


      // =======================================
      // Disabled Schedule
      // =======================================

      if (!schedule.enabled) {
        continue;
      }


      // =======================================
      // Already Executed
      // =======================================

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


      // =======================================
      // ONE-TIME DATE SCHEDULE
      // =======================================

      if (
        schedule.scheduledDate
      ) {


        // Wrong date
        if (
          schedule.scheduledDate !==
          currentDate
        ) {

          continue;

        }


        // Wrong time
        if (
          schedule.startTime !==
          currentTime
        ) {

          continue;

        }


        // =====================================
        // Execute explicit command
        // =====================================

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


      // =======================================
      // RECURRING / NORMAL SCHEDULE
      // =======================================

      if (
        !schedule.days
          .split(",")
          .includes(today)
      ) {

        continue;

      }


      let command = null;


      // =======================================
      // Explicit Voice Command
      // =======================================

      if (
        schedule.command === "ON" &&
        schedule.startTime ===
          currentTime
      ) {

        command = "ON";

      }


      else if (
        schedule.command === "OFF" &&
        schedule.startTime ===
          currentTime
      ) {

        command = "OFF";

      }


      // =======================================
      // Normal Start/End Schedule
      // =======================================

      else if (
        !schedule.command &&
        schedule.startTime ===
          currentTime
      ) {

        command = "ON";

      }


      else if (
        !schedule.command &&
        schedule.endTime ===
          currentTime &&
        schedule.endTime !==
          schedule.startTime
      ) {

        command = "OFF";

      }


      // Nothing to execute
      if (!command) {
        continue;
      }


      // =======================================
      // Execute
      // =======================================

      await executeCommand(
        schedule.deviceId,
        command
      );


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


module.exports = {
  checkSchedules
};
