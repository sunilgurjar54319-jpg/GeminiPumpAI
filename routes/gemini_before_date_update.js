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


const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const SCHEDULE_COLLECTION = "schedules";


// =====================================================
// Voice Command
// =====================================================

router.post("/voice", async (req, res) => {

  try {

    const { text } = req.body;

    if (!text) {

      return res.json({
        success: false,
        message: "Voice text missing"
      });

    }


    // =================================================
    // Parse Voice Schedule
    // =================================================

    const parsed = parseVoiceSchedule(text);


    // =================================================
    // Scheduled Command
    // =================================================

    if (
      parsed &&
      (
        parsed.type === "SCHEDULE" ||
        parsed.type === "RECURRING"
      )
    ) {

      // -----------------------------------------------
      // Parser Error
      // -----------------------------------------------

      if (parsed.error) {

        return res.json({
          success: false,
          message: parsed.error
        });

      }


      // -----------------------------------------------
      // Format Time
      // -----------------------------------------------

      const startTime =
        String(parsed.hour).padStart(2, "0") +
        ":" +
        String(parsed.minute).padStart(2, "0");


      const endTime = startTime;


      // -----------------------------------------------
      // Days
      // -----------------------------------------------

      let days = parsed.day || "";


      // Recurring / Every Day

      if (parsed.type === "RECURRING") {

        days = "Sun,Mon,Tue,Wed,Thu,Fri,Sat";

      }


      // -----------------------------------------------
      // Create Schedule
      // -----------------------------------------------

      const result = await databases.createDocument(

        DATABASE_ID,

        SCHEDULE_COLLECTION,

        ID.unique(),

        {
          deviceId: "PUMP001",

          startTime,

          endTime,

          days,

          enabled: true,

          command: parsed.action,

          lastExecuted: null
        }

      );


      // -----------------------------------------------
      // Response
      // -----------------------------------------------

      return res.json({

        success: true,

        type: parsed.type,

        command: parsed.action,

        scheduledAt: parsed.scheduledAt || null,

        hour: parsed.hour,

        minute: parsed.minute,

        day: parsed.day || null,

        days,

        schedule: result

      });

    }


    // =================================================
    // Immediate Command
    // =================================================

    const command = await understandCommand(text);


    if (!command) {

      return res.json({

        success: false,

        message: "Command not understood"

      });

    }


    const result = await sendCommand(

      "PUMP001",

      command

    );


    return res.json({

      success: true,

      type: "IMMEDIATE",

      command,

      result

    });


  } catch (error) {

    console.error("Voice Error:", error);


    return res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


module.exports = router;
