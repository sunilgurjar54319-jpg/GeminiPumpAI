const cron = require("node-cron");
const databases = require("../config/appwrite");
const { sendCommand } = require("./commandService");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";

async function checkSchedules() {
  try {
    const now = new Date();

    const indiaDate = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const currentTime = indiaDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const dayNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];

    const today = dayNames[indiaDate.getDay()];

    console.log("Scheduler:", today, currentTime);

    const result = await databases.listDocuments(
      DATABASE_ID,
      SCHEDULE_COLLECTION
    );

    for (const schedule of result.documents) {

      if (!schedule.enabled) continue;

      if (!schedule.days.includes(today)) continue;

      if (schedule.startTime === currentTime) {

        await sendCommand(schedule.deviceId, "ON");

        console.log("Scheduled ON:", schedule.deviceId);

      }

      if (schedule.endTime === currentTime) {

        await sendCommand(schedule.deviceId, "OFF");

        console.log("Scheduled OFF:", schedule.deviceId);

      }

    }

  } catch (error) {

    console.log("Scheduler Error:", error.message);

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
