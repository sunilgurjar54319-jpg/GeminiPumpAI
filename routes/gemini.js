
const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");

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
    // VOICE SCHEDULE LIST
    // =========================================

    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("schedule") &&
      (
        lowerText.includes("show") ||
        lowerText.includes("list") ||
        lowerText.includes("dikhao") ||
        lowerText.includes("batao")
      )
    ) {

      const schedules =
        await databases.listDocuments(
          DATABASE_ID,
          SCHEDULE_COLLECTION
        );

      return res.json({
        success: true,
        type: "SCHEDULE_LIST",
        schedules: schedules.documents
      });

    }


    // =========================================
    // VOICE SCHEDULE CANCEL
    // =========================================

    if (
      (
        lowerText.includes("cancel") ||
        lowerText.includes("cancle") ||
        lowerText.includes("delete") ||
        lowerText.includes("hatao") ||
        lowerText.includes("hatado") ||
        lowerText.includes("band karo")
      ) &&
      (
        lowerText.includes("schedule") ||
        lowerText.includes("wala schedule") ||
        lowerText.includes("wali schedule")
      )
    ) {

      const timeMatch = lowerText.match(
        /(\d{1,2})\s*(?::|\.|\s)\s*(\d{2})/
      );

      if (!timeMatch) {
        return res.json({
          success: false,
          type: "SCHEDULE_CANCEL",
          message: "Schedule ka time batao, jaise 12:40 wala schedule cancel karo"
        });
      }

      const cancelHour =
        String(Number(timeMatch[1])).padStart(2, "0");

      const cancelMinute =
        String(Number(timeMatch[2])).padStart(2, "0");

      const cancelTime =
        `${cancelHour}:${cancelMinute}`;

      const result =
        await databases.listDocuments(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          [
            Query.equal("startTime", cancelTime),
            Query.equal("enabled", true)
          ]
        );

      if (result.documents.length === 0) {
        return res.json({
          success: false,
          type: "SCHEDULE_CANCEL",
          message: `${cancelTime} par koi active schedule nahi mila`
        });
      }

      const schedule = result.documents[0];

      await databases.deleteDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id
      );

      return res.json({
        success: true,
        type: "SCHEDULE_CANCEL",
        message: `Schedule ${cancelTime} cancel kar diya`,
        scheduleId: schedule.$id,
        cancelledSchedule: schedule
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

// =========================================
// GET SCHEDULE LIST
// =========================================

router.get("/schedule/list", async (req, res) => {

  try {

    const schedules =
      await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION
      );


    return res.json({
      success: true,
      schedules: schedules.documents
    });


  } catch (error) {

    console.error(
      "Schedule List Error:",
      error
    );

    return res.status(500).json({
      success:false,
      error:error.message
    });

  }

});

// =========================================
// DELETE SCHEDULE
// =========================================

router.delete("/schedule/:id", async (req, res) => {

  try {

    await databases.deleteDocument(
      DATABASE_ID,
      SCHEDULE_COLLECTION,
      req.params.id
    );


    return res.json({
      success:true,
      message:"Schedule deleted"
    });


  } catch(error) {

    console.error(
      "Schedule Delete Error:",
      error
    );


    return res.status(500).json({
      success:false,
      error:error.message
    });

  }

});

module.exports = router;
