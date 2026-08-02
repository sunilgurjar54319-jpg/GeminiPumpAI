
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

const {
  getStatus
} = require("../services/statusService");


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


    // =========================================
    // MOTOR STATUS
    // =========================================

    const isStatusWord =
      lowerText.includes("status") ||
      lowerText.includes("स्टेटस") ||
      lowerText.includes("chal raha") ||
      lowerText.includes("chalu hai") ||
      lowerText.includes("band hai") ||
      lowerText.includes("motor ka haal") ||
      lowerText.includes("motor ki sthiti") ||
      lowerText.includes("motor ki स्थिति");

    const isMotorWord =
      lowerText.includes("motor") ||
      lowerText.includes("pump") ||
      lowerText.includes("मोटर") ||
      lowerText.includes("पंप");

    if (isStatusWord && isMotorWord) {

      const statusResult =
        await getStatus("PUMP001");

      const status =
        statusResult &&
        statusResult.status
          ? statusResult.status
          : "UNKNOWN";

      return res.json({

        success: true,

        type: "STATUS",

        deviceId: "PUMP001",

        status: status,

        message:
          status === "ON"
            ? "Motor ON hai"
            : status === "OFF"
              ? "Motor OFF hai"
              : "Motor ka status available nahi hai"

      });

    }

    // ===== VOICE CANCEL NORMALIZATION =====
lowerText = lowerText
  .replace(/शेड्यूल|शेडुल|शिड्यूल/g, "schedule")
  .replace(/कैंसिल|कैंसल|कैसिल|केसिल/g, "cancel")
  .replace(/हटा दो|हटाओ/g, "delete")
  .replace(/एक\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 1")
  .replace(/दो\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 2")
  .replace(/तीन\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 3")
  .replace(/चार\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 4")
  .replace(/पांच\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 5")
  .replace(/पाँच\s+नंबर\s*(?:वाला|वाली|का|की)?/g, "schedule number 5")
  .replace(/पहला\s*(?:schedule)?/g, "schedule number 1")
  .replace(/दूसरा\s*(?:schedule)?/g, "schedule number 2")
  .replace(/दूसरी\s*(?:schedule)?/g, "schedule number 2")
  .replace(/तीसरा\s*(?:schedule)?/g, "schedule number 3")
  .replace(/तीसरी\s*(?:schedule)?/g, "schedule number 3")
  .replace(/चौथा\s*(?:schedule)?/g, "schedule number 4")
  .replace(/चौथी\s*(?:schedule)?/g, "schedule number 4")
  .trim();

// ===== END VOICE CANCEL NORMALIZATION =====

const isScheduleWord =
  lowerText.includes("schedule") ||
  lowerText.includes("शेड्यूल") ||
  lowerText.includes("शेडूल") ||
  lowerText.includes("शिड्यूल") ||
  lowerText.includes("शेड्चूल") ||
  lowerText.includes("शेडचूल");

const isShowWord =
  lowerText.includes("show") ||
  lowerText.includes("list") ||
  lowerText.includes("dikhao") ||
  lowerText.includes("batao") ||
  lowerText.includes("दिखाओ") ||
  lowerText.includes("बताओ");

const isCancelWord =
  lowerText.includes("cancel") ||
  lowerText.includes("delete") ||
  lowerText.includes("hatao") ||
  lowerText.includes("hatado") ||
  lowerText.includes("कैंसिल") ||
  lowerText.includes("कैसिल") ||
  lowerText.includes("केसिल") ||
  lowerText.includes("हटाओ") ||
  lowerText.includes("हटा दो") ||
  lowerText.includes("रद्द");

const dayMap = {
  "monday": "Mon",
  "mon": "Mon",
  "सोमवार": "Mon",

  "tuesday": "Tue",
  "tue": "Tue",
  "मंगलवार": "Tue",

  "wednesday": "Wed",
  "wed": "Wed",
  "बुधवार": "Wed",

  "thursday": "Thu",
  "thu": "Thu",
  "गुरुवार": "Thu",

  "friday": "Fri",
  "fri": "Fri",
  "शुक्रवार": "Fri",

  "saturday": "Sat",
  "sat": "Sat",
  "शनिवार": "Sat",

  "sunday": "Sun",
  "sun": "Sun",
  "रविवार": "Sun"
};

let cancelDay = null;

for (const [word, day] of Object.entries(dayMap)) {
  if (lowerText.includes(word)) {
    cancelDay = day;
    break;
  }
}

    if (
  isScheduleWord &&
  isShowWord
) {

      const schedules =
        await databases.listDocuments(
          DATABASE_ID,
          SCHEDULE_COLLECTION
        );

      const scheduleList = schedules.documents.map((s, index) => ({
  number: index + 1,
  time: s.startTime,
  startTime: s.startTime,
  endTime: s.endTime || null,
  command: s.command || "ON",
  days: s.days || "हर दिन",
  date: s.scheduledDate || null,
  enabled: s.enabled
}));

return res.json({
  success: true,
  type: "SCHEDULE_LIST",
  count: scheduleList.length,
  schedules: scheduleList
});

    }


    // =========================================
    // =========================================
    // FINAL VOICE SCHEDULE CANCEL
    // =========================================
    // Supports:
    // "schedule number 2 cancel करो"
    // "एक नंबर वाला schedule cancel करो"
    // "पहला schedule cancel करो"
    // "तीसरा schedule delete करो"
    // "12:40 वाला schedule cancel करो"
    // "06:55 वाला schedule cancel करो"
    //
    // IMPORTANT:
    // Disabled schedules भी number/time से cancel होंगे.
    // =========================================

    if (isCancelWord && isScheduleWord) {

      let cancelText = String(lowerText || "")
        .toLowerCase()
        .trim();

      // -----------------------------------------
      // Hindi digits -> English digits
      // -----------------------------------------

      cancelText = cancelText.replace(
        /[०-९]/g,
        d => "०१२३४५६७८९".indexOf(d)
      );

      // -----------------------------------------
      // SCHEDULE NUMBER
      // -----------------------------------------

      let scheduleNumber = null;

      // English:
      // schedule number 2
      // schedule no 2
      // schedule #2
      // number 2
      // #2

      const englishNumberMatch = cancelText.match(
        /(?:schedule\s*(?:number|no\.?|#)?\s*|number\s+|no\.?\s*|#)\s*(\d+)/i
      );

      if (englishNumberMatch) {
        scheduleNumber = Number(englishNumberMatch[1]);
      }

      // -----------------------------------------
      // Hindi ordinal numbers
      // -----------------------------------------

      const ordinalMap = {
        "पहला": 1,
        "पहली": 1,
        "दूसरा": 2,
        "दूसरी": 2,
        "तीसरा": 3,
        "तीसरी": 3,
        "चौथा": 4,
        "चौथी": 4,
        "पांचवा": 5,
        "पाँचवा": 5,
        "पांचवां": 5,
        "पाँचवाँ": 5,
        "छठा": 6,
        "छठी": 6,
        "सातवां": 7,
        "सातवाँ": 7,
        "आठवां": 8,
        "आठवाँ": 8,
        "नौवां": 9,
        "नौवाँ": 9,
        "दसवां": 10,
        "दसवाँ": 10
      };

      if (scheduleNumber === null) {
        for (const [word, num] of Object.entries(ordinalMap)) {
          if (cancelText.includes(word)) {
            scheduleNumber = num;
            break;
          }
        }
      }

      // -----------------------------------------
      // Hindi "एक नंबर वाला"
      // -----------------------------------------

      const hindiNumberMap = {
        "एक": 1,
        "दो": 2,
        "तीन": 3,
        "चार": 4,
        "पांच": 5,
        "पाँच": 5,
        "छह": 6,
        "छः": 6,
        "सात": 7,
        "आठ": 8,
        "नौ": 9,
        "दस": 10
      };

      if (scheduleNumber === null) {
        for (const [word, num] of Object.entries(hindiNumberMap)) {

          const pattern = new RegExp(
            word +
            "\\s*(?:नंबर|नम्बर)" +
            "\\s*(?:वाला|वाली|वाले|का|की)?",
            "i"
          );

          if (pattern.test(cancelText)) {
            scheduleNumber = num;
            break;
          }
        }
      }

      // -----------------------------------------
      // Cancel by NUMBER
      // -----------------------------------------

      if (scheduleNumber !== null) {

        // IMPORTANT:
        // यहां enabled=true नहीं लगाना है.
        // Schedule list की पूरी numbering use होगी.
        const schedules =
          await databases.listDocuments(
            DATABASE_ID,
            SCHEDULE_COLLECTION
          );

        if (
          scheduleNumber < 1 ||
          scheduleNumber > schedules.documents.length
        ) {
          return res.json({
            success: false,
            type: "SCHEDULE_CANCEL",
            message:
              `Schedule number ${scheduleNumber} नहीं मिला`
          });
        }

        const schedule =
          schedules.documents[scheduleNumber - 1];

        await databases.deleteDocument(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          schedule.$id
        );

        return res.json({
          success: true,
          type: "SCHEDULE_CANCEL",
          message:
            `Schedule number ${scheduleNumber} cancel कर दिया`,
          scheduleId: schedule.$id,
          cancelledSchedule: schedule
        });
      }

      // -----------------------------------------
      // Cancel by TIME
      // -----------------------------------------
      // 12:40
      // 12.40
      // 12 40
      // 12 बजे
      // 12 baje

      const timeMatch = cancelText.match(
        /(\d{1,2})\s*(?::|\.|\s)\s*(\d{2})|(\d{1,2})\s*(?:बजे|baje)\b/i
      );

      if (!timeMatch) {
        return res.json({
          success: false,
          type: "SCHEDULE_CANCEL",
          message:
            "Schedule number या time बताइए, जैसे 'एक नंबर वाला schedule cancel करो' या '12:40 वाला schedule cancel करो'"
        });
      }

      let cancelHour = Number(
        timeMatch[1] !== undefined
          ? timeMatch[1]
          : timeMatch[3]
      );

      const cancelMinute =
        timeMatch[2] !== undefined
          ? String(Number(timeMatch[2])).padStart(2, "0")
          : "00";

      // शाम / रात / PM
      const isPM =
        cancelText.includes("pm") ||
        cancelText.includes("शाम") ||
        cancelText.includes("shaam") ||
        cancelText.includes("रात") ||
        cancelText.includes("raat") ||
        cancelText.includes("दोपहर") ||
        cancelText.includes("dopahar");

      if (
        isPM &&
        cancelHour >= 1 &&
        cancelHour <= 11
      ) {
        cancelHour += 12;
      }

      if (
        cancelHour < 0 ||
        cancelHour > 23 ||
        Number(cancelMinute) < 0 ||
        Number(cancelMinute) > 59
      ) {
        return res.json({
          success: false,
          type: "SCHEDULE_CANCEL",
          message: "सही schedule time बताइए"
        });
      }

      const cancelTime =
        `${String(cancelHour).padStart(2, "0")}:${cancelMinute}`;

      // IMPORTANT:
      // enabled=true नहीं लगाना है.
      // Disabled schedule भी time से delete होगा.

      const result =
        await databases.listDocuments(
          DATABASE_ID,
          SCHEDULE_COLLECTION,
          [
            Query.equal("startTime", cancelTime)
          ]
        );

      if (result.documents.length === 0) {
        return res.json({
          success: false,
          type: "SCHEDULE_CANCEL",
          message:
            `${cancelTime} वाला कोई schedule नहीं मिला`
        });
      }

      const schedule =
        result.documents[0];

      await databases.deleteDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION,
        schedule.$id
      );

      return res.json({
        success: true,
        type: "SCHEDULE_CANCEL",
        message:
          `${cancelTime} वाला schedule cancel कर दिया`,
        scheduleId: schedule.$id,
        cancelledSchedule: schedule
      });
    }


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
      // TWO-TIME RECURRING SCHEDULE
      // Example:
      // Monday ko 6 baje ON karo aur 8 baje OFF karo
      // =========================================

      if (
        parsed.type === "TWO_TIME_RECURRING"
      ) {

        const startTime =
          String(parsed.hour)
            .padStart(2, "0")
          + ":" +
          String(parsed.minute)
            .padStart(2, "0");

        const endTime =
          String(parsed.endHour)
            .padStart(2, "0")
          + ":" +
          String(parsed.endMinute)
            .padStart(2, "0");


        const result =
          await databases.createDocument(

            DATABASE_ID,

            SCHEDULE_COLLECTION,

            ID.unique(),

            {

              deviceId: "PUMP001",

              startTime: startTime,

              endTime: endTime,

              days: parsed.days,

              enabled: true,

              command: "ON"

            }

          );


        return res.json({

          success: true,

          type: "TWO_TIME_RECURRING",

          command: "ON",

          startTime,

          endTime,

          days: parsed.days,

          schedule: result

        });

      }


      // =========================================
      // TWO-TIME TODAY SCHEDULE
      // Example:
      // आज शाम 7 बजे ON करो और 8 बजे OFF करो
      // =========================================

      if (
        parsed.type === "TWO_TIME_TODAY"
      ) {

        const startTime =
          String(parsed.hour)
            .padStart(2, "0")
          + ":" +
          String(parsed.minute)
            .padStart(2, "0");

        const endTime =
          String(parsed.endHour)
            .padStart(2, "0")
          + ":" +
          String(parsed.endMinute)
            .padStart(2, "0");

        const result =
          await databases.createDocument(

            DATABASE_ID,

            SCHEDULE_COLLECTION,

            ID.unique(),

            {

              deviceId: "PUMP001",

              startTime: startTime,

              endTime: endTime,

              days: parsed.day,

              enabled: true,

              command: "ON",

              scheduledDate:
                parsed.scheduledDate

            }

          );

        return res.json({

          success: true,

          type: "TWO_TIME_TODAY",

          command: "ON",

          startTime,

          endTime,

          day: parsed.day,

          scheduledDate:
            parsed.scheduledDate,

          schedule: result

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
