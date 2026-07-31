const cron = require("node-cron");
const databases = require("../config/appwrite");
const { sendCommand, completeCommand } = require("./commandService");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";

async function executeCommand(deviceId, command) {

  const cmd = await sendCommand(deviceId, command);

  if (cmd && cmd.$id && !cmd.executed) {
    await completeCommand(cmd.$id);
  }

}

async function checkSchedules() {

  try {

    const now = new Date();

    const indiaDate = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata"
      })
    );

    const currentTime = indiaDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const today =
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        indiaDate.getDay()
      ];

    console.log("Scheduler:", today, currentTime);

    const result = await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION
    );

    for (const schedule of result.documents) {

      if (!schedule.enabled) {
        continue;
      }

      if (!schedule.days.includes(today)) {
        continue;
      }

      // Prevent duplicate execution
      const lastExecuted = schedule.lastExecuted || "";

      const executionKey =
        `${today}-${currentTime}-${schedule.$id}`;

      if (lastExecuted === executionKey) {
        continue;
      }

      let command = null;

      // Voice schedule with explicit command
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

      // Normal schedule
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

      if (!command) {
        continue;
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
          lastExecuted: executionKey
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
