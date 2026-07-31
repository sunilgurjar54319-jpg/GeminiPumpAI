function parseVoiceSchedule(text) {

  const command = text.toLowerCase().trim();

  let action = null;

  // =========================================
  // ON
  // =========================================

  if (
    command.includes("चालू") ||
    command.includes("chalu") ||
    command.includes("start") ||
    command.includes("on")
  ) {
    action = "ON";
  }

  // =========================================
  // OFF
  // =========================================

  if (
    command.includes("बंद") ||
    command.includes("band") ||
    command.includes("stop") ||
    command.includes("off")
  ) {
    action = "OFF";
  }

  // No ON/OFF command
  if (!action) {
    return null;
  }


  // =========================================
  // IMMEDIATE COMMAND
  // =========================================
  // Example:
  // pump on karo
  // pump off karo
  // motor chalu karo
  // motor band karo
  //
  // Agar time/day/date nahi hai,
  // ise schedule mat samjho.
  // Gemini route immediate command handle karega.

  const hasTime =
    /(\d{1,2})(?::(\d{2}))?\s*(?:बजे|baje)?/.test(command);

  const hasDay =
    command.includes("आज") ||
    command.includes("aaj") ||
    command.includes("today") ||
    command.includes("कल") ||
    command.includes("kal") ||
    command.includes("tomorrow") ||
    command.includes("हर दिन") ||
    command.includes("हर रोज") ||
    command.includes("har din") ||
    command.includes("har roj") ||
    command.includes("daily") ||
    command.includes("रविवार") ||
    command.includes("सोमवार") ||
    command.includes("मंगलवार") ||
    command.includes("बुधवार") ||
    command.includes("गुरुवार") ||
    command.includes("शुक्रवार") ||
    command.includes("शनिवार") ||
    command.includes("ravivar") ||
    command.includes("somvar") ||
    command.includes("mangalvar") ||
    command.includes("budhvar") ||
    command.includes("guruvaar") ||
    command.includes("guruvar") ||
    command.includes("shukravar") ||
    command.includes("shanivar");

  const hasScheduleWord =
    command.includes("schedule") ||
    command.includes("शेड्यूल") ||
    command.includes("समय") ||
    command.includes("time") ||
    command.includes("बजे") ||
    command.includes("baje");

  if (!hasTime && !hasDay && !hasScheduleWord) {
    return null;
  }


  // =========================================
  // Time
  // =========================================

  let hour = null;
  let minute = 0;

  const timeMatch = command.match(
    /(\d{1,2})(?::(\d{2}))?\s*(?:बजे|baje)?/
  );

  if (!timeMatch) {

    return {
      type: "SCHEDULE",
      action,
      error: "Time not found"
    };

  }

  hour = Number(timeMatch[1]);

  if (timeMatch[2]) {
    minute = Number(timeMatch[2]);
  }


  // =========================================
  // AM / PM
  // =========================================

  if (
    command.includes("शाम") ||
    command.includes("shaam") ||
    command.includes("pm")
  ) {

    if (hour < 12) {
      hour += 12;
    }

  }


  if (
    command.includes("दोपहर") ||
    command.includes("dopahar")
  ) {

    if (hour < 12) {
      hour += 12;
    }

  }


  if (
    command.includes("सुबह") ||
    command.includes("subah") ||
    command.includes("morning")
  ) {

    if (hour === 12) {
      hour = 0;
    }

  }


  // =========================================
  // Validate Time
  // =========================================

  if (
    hour > 23 ||
    minute > 59
  ) {

    return {
      type: "SCHEDULE",
      action,
      error: "Invalid time"
    };

  }


  // =========================================
  // Current India Date
  // =========================================

  const now = new Date();

  const indiaString =
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    });

  const indiaDate =
    new Date(indiaString);


  // =========================================
  // Day Names
  // =========================================

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];


  const hindiDays = {

    "रविवार": "Sun",
    "सोमवार": "Mon",
    "मंगलवार": "Tue",
    "बुधवार": "Wed",
    "गुरुवार": "Thu",
    "शुक्रवार": "Fri",
    "शनिवार": "Sat",

    "ravivar": "Sun",
    "somvar": "Mon",
    "mangalvar": "Tue",
    "budhvar": "Wed",
    "guruvaar": "Thu",
    "guruvar": "Thu",
    "shukravar": "Fri",
    "shanivar": "Sat"

  };


  // =========================================
  // हर दिन / Daily
  // =========================================

  if (
    command.includes("हर दिन") ||
    command.includes("हर रोज") ||
    command.includes("har din") ||
    command.includes("har roj") ||
    command.includes("daily")
  ) {

    return {

      type: "RECURRING",

      action,

      hour,

      minute,

      days:
        "Sun,Mon,Tue,Wed,Thu,Fri,Sat"

    };

  }


  // =========================================
  // Specific Weekday
  // =========================================

  let selectedDay = null;

  for (
    const key of Object.keys(hindiDays)
  ) {

    if (command.includes(key)) {

      selectedDay = hindiDays[key];

      break;

    }

  }


  // =========================================
  // Today
  // =========================================

  if (
    command.includes("आज") ||
    command.includes("aaj") ||
    command.includes("today")
  ) {

    const currentHour =
      indiaDate.getHours();

    const currentMinute =
      indiaDate.getMinutes();


    if (
      hour < currentHour ||
      (
        hour === currentHour &&
        minute <= currentMinute
      )
    ) {

      return {

        type: "SCHEDULE",

        action,

        error:
          "Time has already passed today"

      };

    }


    const scheduledDate =
      indiaDate.getFullYear() +
      "-" +
      String(
        indiaDate.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        indiaDate.getDate()
      ).padStart(2, "0");


    return {

      type: "SCHEDULE",

      action,

      scheduledAt:
        `${scheduledDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`,

      scheduledDate,

      hour,

      minute,

      day:
        dayNames[indiaDate.getDay()]

    };

  }


  // =========================================
  // Tomorrow
  // =========================================

  if (
    command.includes("कल") ||
    command.includes("kal") ||
    command.includes("tomorrow")
  ) {

    const date =
      new Date(indiaDate);

    date.setDate(
      date.getDate() + 1
    );


    const scheduledDate =
      date.getFullYear() +
      "-" +
      String(
        date.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        date.getDate()
      ).padStart(2, "0");


    return {

      type: "SCHEDULE",

      action,

      scheduledAt:
        `${scheduledDate}T${String(date.getHours()).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`.replace(
          `${String(date.getHours()).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        ),

      scheduledDate,

      hour,

      minute,

      day:
        dayNames[date.getDay()]

    };

  }


  // =========================================
  // Specific Weekday
  // =========================================

  if (selectedDay) {

    const currentDay =
      indiaDate.getDay();

    const targetDay =
      dayNames.indexOf(selectedDay);


    let difference =
      targetDay - currentDay;


    if (difference <= 0) {
      difference += 7;
    }


    const date =
      new Date(indiaDate);

    date.setDate(
      date.getDate() + difference
    );


    const scheduledDate =
      date.getFullYear() +
      "-" +
      String(
        date.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        date.getDate()
      ).padStart(2, "0");


    return {

      type: "RECURRING",

      action,

      hour,

      minute,

      days: selectedDay,

      scheduledDate

    };

  }


  // =========================================
  // No day specified
  // =========================================

  return {

    type: "SCHEDULE",

    action,

    error:
      "Date or day not found"

  };

}


module.exports = {
  parseVoiceSchedule
};
