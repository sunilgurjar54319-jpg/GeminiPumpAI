function parseVoiceSchedule(text) {

  const command = text.toLowerCase().trim();

  let action = null;

  // =========================================
  // ON / OFF ACTION
  // =========================================

  const onWords = [
    "चालू",
    "chalu",
    "start",
    "on"
  ];

  const offWords = [
    "बंद",
    "band",
    "stop",
    "off"
  ];

  let onPosition = -1;
  let offPosition = -1;

  for (const word of onWords) {
    const position = command.indexOf(word);

    if (position !== -1) {
      if (onPosition === -1 || position < onPosition) {
        onPosition = position;
      }
    }
  }

  for (const word of offWords) {
    const position = command.indexOf(word);

    if (position !== -1) {
      if (offPosition === -1 || position < offPosition) {
        offPosition = position;
      }
    }
  }

  if (onPosition !== -1 && offPosition !== -1) {
    action =
      onPosition < offPosition
        ? "ON"
        : "OFF";
  } else if (onPosition !== -1) {
    action = "ON";
  } else if (offPosition !== -1) {
    action = "OFF";
  }

// No ON/OFF command
if (!action) {
  return null;
}
// =========================================
// DURATION MODE
// Example:
// pump 10 minute ke liye on karo
// motor 5 minute ke liye chalu karo
// pump 2 ghante ke liye on karo
// =========================================

const durationMatch = command.match(
  /(\d+)\s*(minute|minutes|min|मिनट|hour|hours|hr|ghanta|ghante|घंटा|घंटे)/i
);

const hasBajkarEndTime =
  /(\d{1,2})\s*(?:बजकर|bajkar)\s*(\d{1,2})\s*(?:मिनट|minute)/i.test(command);

if (
  durationMatch &&
  action === "ON" &&
  !hasBajkarEndTime
) {

  let value = Number(durationMatch[1]);
  let unit = durationMatch[2].toLowerCase();

  let durationMinutes = value;

  if (
    unit.includes("hour") ||
    unit.includes("hr") ||
    unit.includes("ghanta") ||
    unit.includes("ghante") ||
    unit.includes("घंट")
  ) {
    durationMinutes = value * 60;
  }

  const MAX_RUNTIME_MINUTES = 240;

  if (durationMinutes > MAX_RUNTIME_MINUTES) {
    return {
      error: "Maximum pump runtime is 4 hours"
    };
  }

  /*
   * IMPORTANT:
   * अगर command में कोई date/day/time मौजूद है,
   * तो इसे immediate duration नहीं मानेंगे.
   *
   * Example:
   * आज शाम 7 बजे पंखा ON करो 5 मिनट के लिए
   *
   * Duration phrase हटाकर बाकी text को normal
   * schedule parser से parse करेंगे.
   */

  const commandWithoutDuration =
    command
      .replace(durationMatch[0], " ")
      .replace(/\s+/g, " ")
      .trim();

  const hasExplicitSchedule =
    commandWithoutDuration.includes("आज") ||
    commandWithoutDuration.includes("aaj") ||
    commandWithoutDuration.includes("today") ||
    commandWithoutDuration.includes("कल") ||
    commandWithoutDuration.includes("kal") ||
    commandWithoutDuration.includes("tomorrow") ||
    commandWithoutDuration.includes("हर दिन") ||
    commandWithoutDuration.includes("हर रोज") ||
    commandWithoutDuration.includes("har din") ||
    commandWithoutDuration.includes("har roj") ||
    commandWithoutDuration.includes("daily") ||
    commandWithoutDuration.includes("रविवार") ||
    commandWithoutDuration.includes("सोमवार") ||
    commandWithoutDuration.includes("मंगलवार") ||
    commandWithoutDuration.includes("बुधवार") ||
    commandWithoutDuration.includes("गुरुवार") ||
    commandWithoutDuration.includes("शुक्रवार") ||
    commandWithoutDuration.includes("शनिवार") ||
    commandWithoutDuration.includes("ravivar") ||
    commandWithoutDuration.includes("somvar") ||
    commandWithoutDuration.includes("mangalvar") ||
    commandWithoutDuration.includes("budhvar") ||
    commandWithoutDuration.includes("guruvaar") ||
    commandWithoutDuration.includes("guruvar") ||
    commandWithoutDuration.includes("shukravar") ||
    commandWithoutDuration.includes("shanivar") ||
    /(\d{1,2})(?::|\.|\s*(?:बजे|baje|बजकर|bajkar))/.test(
      commandWithoutDuration
    ) ||
    commandWithoutDuration.includes("शाम") ||
    commandWithoutDuration.includes("shaam") ||
    commandWithoutDuration.includes("सुबह") ||
    commandWithoutDuration.includes("subah") ||
    commandWithoutDuration.includes("दोपहर") ||
    commandWithoutDuration.includes("dopahar") ||
    commandWithoutDuration.includes("pm") ||
    commandWithoutDuration.includes("am");

  if (hasExplicitSchedule) {

    const scheduled = parseVoiceSchedule(commandWithoutDuration);

    if (scheduled && !scheduled.error) {
      return {
        ...scheduled,
        type: "DURATION",
        action: "ON",
        durationMinutes
      };
    }

    if (scheduled && scheduled.error) {
      return {
        ...scheduled,
        type: "DURATION",
        action: "ON",
        durationMinutes
      };
    }

  }

  return {
    type: "DURATION",
    action: "ON",
    durationMinutes
  };
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

  // Find all times in the voice command.
  // Supports:
  // 7 baje ... 8 baje
  // 7:00 ... 8:00
  // 7 bajkar 2 minute ... 8 bajkar 5 minute
  //
  // IMPORTANT:
  // "bajkar" time is treated as ONE complete time.
  // Example: 19 bajkar 16 minute => 19:16

  const timeMatches = [
    ...command.matchAll(
      /(\d{1,2})\s*(?:बजकर|bajkar)\s*(\d{1,2})\s*(?:मिनट|minute)\b|(\d{1,2})(?::|\.)(\d{2})\s*(?:बजे|baje)?|(\d{1,2})\s*(?:बजे|baje)/gi
    )
  ];

  if (timeMatches.length === 0) {

    return {
      type: "SCHEDULE",
      action,
      error: "Time not found"
    };

  }

  const parsedTimes = timeMatches.map(match => {

    // X bajkar Y minute
    if (match[1] !== undefined) {
      return {
        hour: Number(match[1]),
        minute: Number(match[2])
      };
    }

    // X:YY or X.YY
    if (match[3] !== undefined) {
      return {
        hour: Number(match[3]),
        minute: Number(match[4])
      };
    }

    // X baje
    return {
      hour: Number(match[5]),
      minute: 0
    };

  });

  hour = parsedTimes[0].hour;
  minute = parsedTimes[0].minute;

  let secondHour = null;
  let secondMinute = 0;

  if (parsedTimes.length >= 2) {

    secondHour = parsedTimes[1].hour;
    secondMinute = parsedTimes[1].minute;

  }

  console.log("DEBUG parsedTimes:", JSON.stringify(parsedTimes));
  console.log("DEBUG secondHour:", secondHour, "secondMinute:", secondMinute);

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

  // Apply AM/PM context to second time too.
  // Example:
  // आज शाम 7 बजे ON करो और 8 बजे OFF करो
  // => 19:00 -> 20:00

  if (
    secondHour !== null &&
    (
      command.includes("शाम") ||
      command.includes("shaam") ||
      command.includes("pm")
    )
  ) {

    if (secondHour < 12) {
      secondHour += 12;
    }

  }

  if (
    secondHour !== null &&
    (
      command.includes("दोपहर") ||
      command.includes("dopahar")
    )
  ) {

    if (secondHour < 12) {
      secondHour += 12;
    }

  }

  if (
    secondHour !== null &&
    (
      command.includes("सुबह") ||
      command.includes("subah") ||
      command.includes("morning")
    )
  ) {

    if (secondHour === 12) {
      secondHour = 0;
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
    "shanivar": "Sat",

    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri",
    "saturday": "Sat",
    "sunday": "Sun"

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

    const allDays =
      "Sun,Mon,Tue,Wed,Thu,Fri,Sat";

    // हर दिन दो समय:
    // 10:00 ON और 11:00 OFF
    if (secondHour !== null) {

      return {
        type: "TWO_TIME_RECURRING",
        action: "ON",
        hour,
        minute,
        endHour: secondHour,
        endMinute: secondMinute,
        days: allDays,
        scheduledDate: null
      };

    }

    // केवल एक समय:
    // हर दिन 10:00 बजे मोटर चालू करो
    return {
      type: "RECURRING",
      action,
      hour,
      minute,
      days: allDays
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

    // =========================================
    // TWO-TIME TODAY SCHEDULE
    // Example:
    // आज शाम 7 बजे ON करो और 8 बजे OFF करो
    // =========================================

    if (secondHour !== null) {

      if (
        secondHour > 23 ||
        secondMinute > 59
      ) {

        return {

          type: "SCHEDULE",

          action,

          error: "Invalid end time"

        };

      }

      return {

        type: "TWO_TIME_TODAY",

        action: "ON",

        hour,

        minute,

        endHour: secondHour,

        endMinute: secondMinute,

        day:
          dayNames[indiaDate.getDay()],

        scheduledDate

      };

    }


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

    // Two-time recurring schedule:
    // Example:
    // हर सोमवार 10:00 बजे ON और 11:00 बजे OFF
    if (secondHour !== null) {

      return {

        type: "TWO_TIME_RECURRING",

        action: "ON",

        hour,

        minute,

        endHour: secondHour,

        endMinute: secondMinute,

        days: selectedDay,

        scheduledDate

      };

    }


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


    // Two-time recurring schedule:
    // Example:
    // Monday ko 6 baje ON karo aur 8 baje OFF karo
    if (secondHour !== null) {

      if (
        hour > 23 ||
        minute > 59 ||
        secondHour > 23 ||
        secondMinute > 59
      ) {

        return {
          type: "SCHEDULE",
          action,
          error: "Invalid time"
        };

      }

      return {

        type: "TWO_TIME_RECURRING",

        action: "ON",

        hour,

        minute,

        endHour: secondHour,

        endMinute: secondMinute,

        days: selectedDay,

        scheduledDate

      };

    }

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
