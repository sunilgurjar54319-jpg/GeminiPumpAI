const cron = require("node-cron");
const databases = require("../config/appwrite");
const {
  sendCommand,
  completeCommand
} = require("./commandService");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";


// =====================================================
// Execute Command
// =====================================================

async function executeCommand(deviceId, command) {

  const cmd = await sendCommand(
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


// =====================================================
// Check Schedules
// =====================================================

async function checkSchedules() {

  try {

    // -------------------------------------------------
    // Current India Time
    // -------------------------------------------------

    const now = new Date();

    const indiaString =
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata"
      });

    const indiaDate =
      new Date(indiaString);


    const currentTime =
      indiaDate.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );


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


    // YYYY-MM-DD

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


    console.log(
      "Scheduler:",
      currentDate,
      today,
      currentTime
    );


    // -------------------------------------------------
    // Get schedules
    // -------------------------------------------------

    const result =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION
      );


    // -------------------------------------------------
    // Process schedules
    // -------------------------------------------------

    for (
      const schedule of result.documents
    ) {

      // Disabled schedule

      if (!schedule.enabled) {
        continue;
      }


      // -------------------------------------------------
      // Check Day
      // -------------------------------------------------

      if (!schedule.days) {
        continue;
      }


      const scheduleDays =
        schedule.days
          .split(",")
          .map(day => day.trim());


      if (
        !scheduleDays.includes(today)
      ) {
        continue;
      }


      // -------------------------------------------------
      // Prevent duplicate execution
      // -------------------------------------------------

      const lastExecuted =
        schedule.lastExecuted || "";


      const executionKey =
        `${currentDate}-${currentTime}-${schedule.$id}`;


      if (
        lastExecuted === executionKey
      ) {
        continue;
      }


      // -------------------------------------------------
      // Determine Command
      // -------------------------------------------------

      let command = null;


      // =================================================
      // Voice Schedule
      // =================================================

      if (
        schedule.command === "ON" &&
        schedule.startTime === currentTime
      ) {

        command = "ON";

      }


      else if (
        schedule.command === "OFF" &&
        schedule.startTime === currentTime
      ) {

        command = "OFF";

      }


      // =================================================
      // Normal Schedule
      // =================================================

      else if (
        !schedule.command &&
        schedule.startTime === currentTime
      ) {

        command = "ON";

      }


      else if (
        !schedule.command &&
        schedule.endTime === currentTime &&
        schedule.endTime !== schedule.startTime
      ) {

        command = "OFF";

      }


      // -------------------------------------------------
      // Nothing to execute
      // -------------------------------------------------

      if (!command) {
        continue;
      }


      // -------------------------------------------------
      // Execute
      // -------------------------------------------------

      await executeCommand(
        schedule.deviceId,
        command
      );


      // -------------------------------------------------
      // Mark executed
      // -------------------------------------------------

      await databases.updateDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id,
        {
          lastExecuted: executionKey
        }
      );


      console.log(
        `✅ Scheduled ${command}:`,
        schedule.deviceId,
        "|",
        currentDate,
        today,
        currentTime
      );

    }

  }

  catch (error) {

    console.log(
      "Scheduler Error:",
      error.message
    );

  }

}


// =====================================================
// Cron — Every Minute
// =====================================================

cron.schedule(
  "* * * * *",
  checkSchedules,
  {
    timezone: "Asia/Kolkata"
  }
);


module.exports = {
  checkSchedules
};
