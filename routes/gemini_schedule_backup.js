const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { ID } = require("node-appwrite");

const {
  understandCommand
} = require("../services/geminiService");

const {
  parseVoiceSchedule
} = require("../services/voiceScheduleService");

const {
  sendCommand
} = require("../services/commandService");


const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID;

const SCHEDULE_COLLECTION =
  "schedules";


router.post("/voice", async (req, res) => {

  try {

    const { text } = req.body;


    // =========================================
    // Voice Text Check
    // =========================================

    if (!text) {

      return res.json({

        success: false,

        message: "Voice text missing"

      });

    }


    // =========================================
    // Parse Voice
    // =========================================

    const parsed =
      parseVoiceSchedule(text);


    // =========================================
    // Scheduled / Recurring Command
    // =========================================

    if (parsed) {


      // -----------------------------------------
      // Parser Error
      // -----------------------------------------

      if (parsed.error) {

        return res.json({

          success: false,

          message: parsed.error

        });

      }


      // =========================================
      // RECURRING
      // =========================================

      if (
        parsed.type === "RECURRING"
      ) {

        const startTime =
          String(parsed.hour)
            .padStart(2, "0")
          + ":" +
          String(parsed.minute)
            .padStart(2, "0");


        const result =
          await databases.createDocument(

            DATABASE_ID,

            SCHEDULE_COLLECTION,

            ID.unique(),

            {

              deviceId: "PUMP001",

              startTime: startTime,

              endTime: startTime,

              days: parsed.days,

              enabled: true,

              command: parsed.action

            }

          );


        return res.json({

          success: true,

          type: "RECURRING",

          command: parsed.action,

          hour: parsed.hour,

          minute: parsed.minute,

          days: parsed.days,

          schedule: result

        });

      }


      // =========================================
      // =========================================
      // DURATION SCHEDULE
      // =========================================

      if (parsed.type === "DURATION") {

          // Current India Time
  const now = new Date();

  const indiaDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    })
  );

    // Send ON Immediately
  await sendCommand(
    "PUMP001",
    "ON"
  );

  // OFF Time
  const offDate = new Date(indiaDate);

  offDate.setMinutes(
    offDate.getMinutes() +
    parsed.durationMinutes
  );

    const scheduledDate =
    offDate.getFullYear() +
    "-" +
    String(offDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(offDate.getDate()).padStart(2, "0");

  const offTime =
    String(offDate.getHours()).padStart(2, "0") +
    ":" +
    String(offDate.getMinutes()).padStart(2, "0");

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];

    const result =
    await databases.createDocument(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      ID.unique(),
      {
        deviceId: "PUMP001",
        startTime: offTime,
        endTime: offTime,
        days: dayNames[offDate.getDay()],
        enabled: true,
        command: "OFF",
        scheduledDate: scheduledDate
      }
    );

      return res.json({

    success: true,

    type: "DURATION",

    command: "ON",

    durationMinutes: parsed.durationMinutes,

    offAt: `${scheduledDate} ${offTime}`,

    schedule: result

  });

}
      // ONE-TIME DATE SCHEDULE
      // =========================================

      if (
        parsed.type === "SCHEDULE"
      ) {


        const date =
          new Date(
            parsed.scheduledAt
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


        const day =
          dayNames[
            date.getDay()
          ];


        const startTime =
          String(parsed.hour)
            .padStart(2, "0")
          + ":" +
          String(parsed.minute)
            .padStart(2, "0");


        const result =
          await databases.createDocument(

            DATABASE_ID,

            SCHEDULE_COLLECTION,

            ID.unique(),

            {

              deviceId: "PUMP001",

              startTime: startTime,

              endTime: startTime,

              days: day,

              enabled: true,

              command: parsed.action,

              scheduledDate:
                parsed.scheduledDate

            }

          );


        return res.json({

          success: true,

          type: "SCHEDULE",

          command: parsed.action,

          scheduledAt:
            parsed.scheduledAt,

          scheduledDate:
            parsed.scheduledDate,

          hour:
            parsed.hour,

          minute:
            parsed.minute,

          day: day,

          schedule: result

        });

      }

    }


    // =========================================
    // Immediate ON / OFF Command
    // =========================================

    const command =
      await understandCommand(text);


    if (!command) {

      return res.json({

        success: false,

        message:
          "Command not understood"

      });

    }


    const result =
      await sendCommand(

        "PUMP001",

        command

      );


    return res.json({

      success: true,

      type: "IMMEDIATE",

      command: command,

      result: result

    });


  } catch (error) {

    console.error(
      "Voice Route Error:",
      error
    );


    return res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


module.exports = router;
