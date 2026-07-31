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


router.post("/voice", async (req, res) => {

  try {

    const { text } = req.body;

    if (!text) {

      return res.json({
        success: false,
        message: "Voice text missing"
      });

    }


    // Check scheduled voice command
    const parsed = parseVoiceSchedule(text);


    // =====================================
    // Scheduled Command
    // =====================================

    if (
      parsed &&
      parsed.type === "SCHEDULE"
    ) {

      if (parsed.error) {

        return res.json({
          success: false,
          message: parsed.error
        });

      }


      const date = new Date(parsed.scheduledAt);


      const dayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
      ];


      const day = dayNames[date.getDay()];


      const startTime =
        String(parsed.hour).padStart(2, "0") +
        ":" +
        String(parsed.minute).padStart(2, "0");


      const endTime = startTime;


      const result = await databases.createDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        ID.unique(),
        {
          deviceId: "PUMP001",
          startTime: startTime,
          endTime: endTime,
          days: day,
          enabled: true,
          command: parsed.action
        }
      );


      return res.json({

        success: true,

        type: "SCHEDULE",

        command: parsed.action,

        scheduledAt: parsed.scheduledAt,

        schedule: result

      });

    }


    // =====================================
    // Immediate Command
    // =====================================

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


    res.json({

      success: true,

      type: "IMMEDIATE",

      command: command,

      result: result

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


module.exports = router;
