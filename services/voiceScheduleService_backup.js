function parseVoiceSchedule(text) {

  const command = text.toLowerCase().trim();

  let action = null;

  // =========================
  // ON
  // =========================

  if (
    command.includes("चालू") ||
    command.includes("chalu") ||
    command.includes("start") ||
    command.includes("on")
  ) {
    action = "ON";
  }

  // =========================
  // OFF
  // =========================

  if (
    command.includes("बंद") ||
    command.includes("band") ||
    command.includes("stop") ||
    command.includes("off")
  ) {
    action = "OFF";
  }

  if (!action) {
    return null;
  }

  // =========================
  // DAY NAMES
  // =========================

  const dayMap = {

    "रविवार": "Sun",
    "ravivar": "Sun",
    "sunday": "Sun",

    "सोमवार": "Mon",
    "somvar": "Mon",
    "somwaar": "Mon",
    "monday": "Mon",

    "मंगलवार": "Tue",
    "mangalvar": "Tue",
    "mangalwaar": "Tue",
    "tuesday": "Tue",

    "बुधवार": "Wed",
    "budhvar": "Wed",
    "budhwaar": "Wed",
    "wednesday": "Wed",

    "गुरुवार": "Thu",
    "guruwar": "Thu",
    "guruvaar": "Thu",
    "thursday": "Thu",

    "शुक्रवार": "Fri",
    "shukravar": "Fri",
    "shukravaar": "Fri",
    "friday": "Fri",

    "शनिवार": "Sat",
    "shanivar": "Sat",
    "shanivaar": "Sat",
    "saturday": "Sat"
  };

  let selectedDay = null;

  for (const name in dayMap) {

    if (command.includes(name)) {
      selectedDay = dayMap[name];
      break;
    }

  }

  // =========================
  // TODAY / TOMORROW / DAY AFTER
  // =========================

  const isToday =
    command.includes("आज") ||
    command.includes("aaj") ||
    command.includes("today");

  const isTomorrow =
    command.includes("कल") ||
    command.includes("kal") ||
    command.includes("tomorrow");

  const isDayAfterTomorrow =
    command.includes("परसों") ||
    command.includes("parso") ||
    command.includes("day after tomorrow");

  // =========================
  // EVERY DAY
  // =========================

  const everyDay =
    command.includes("हर दिन") ||
    command.includes("har din") ||
    command.includes("daily") ||
    command.includes("every day");

  // =========================
  // TIME
  // =========================

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

  // =========================
  // AM / PM
  // =========================

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
    command.includes("सुबह") ||
    command.includes("subah") ||
    command.includes("morning") ||
    command.includes("am")
  ) {

    if (hour === 12) {
      hour = 0;
    }

  }

  if (
    command.includes("दोपहर") ||
    command.includes("dopahar") ||
    command.includes("afternoon")
  ) {

    if (hour < 12) {
      hour += 12;
    }

  }

  // =========================
  // VALIDATE TIME
  // =========================

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {

    return {
      type: "SCHEDULE",
      action,
      error: "Invalid time"
    };

  }

  // =========================
  // CURRENT INDIA DATE
  // =========================

  const now = new Date();

  const indiaString = now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });

  const indiaDate = new Date(indiaString);

  // =========================
  // EVERY DAY
  // =========================

  if (everyDay) {

    return {

      type: "RECURRING",

      action,

      hour,

      minute,

      days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat"

    };

  }

  // =========================
  // SPECIFIC WEEKDAY
  // =========================

  if (selectedDay) {

    const dayNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ];

    const targetIndex = dayNames.indexOf(selectedDay);
    const currentIndex = indiaDate.getDay();

    let daysAhead =
      (targetIndex - currentIndex + 7) % 7;

    // अगर वही दिन है लेकिन समय निकल चुका है,
    // तो अगले सप्ताह का वही दिन लें।

    if (daysAhead === 0) {

      const targetTime = new Date(indiaDate);

      targetTime.setHours(hour);
      targetTime.setMinutes(minute);
      targetTime.setSeconds(0);
      targetTime.setMilliseconds(0);

      if (targetTime <= indiaDate) {
        daysAhead = 7;
      }

    }

    const date = new Date(indiaDate);

    date.setDate(
      date.getDate() + daysAhead
    );

    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);
    date.setMilliseconds(0);

    const scheduledAt = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours() - 5,
        date.getMinutes() - 30,
        0,
        0
      )
    ).toISOString();

    return {

      type: "SCHEDULE",

      action,

      scheduledAt,

      hour,

      minute,

      day: selectedDay

    };

  }

  // =========================
  // TODAY / TOMORROW / DAY AFTER
  // =========================

  const date = new Date(indiaDate);

  if (isTomorrow) {

    date.setDate(
      date.getDate() + 1
    );

  }

  if (isDayAfterTomorrow) {

    date.setDate(
      date.getDate() + 2
    );

  }

  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  // =========================
  // TODAY PAST TIME
  // =========================

  if (isToday && date <= indiaDate) {

    return {

      type: "SCHEDULE",

      action,

      error: "Time has already passed today"

    };

  }

  // =========================
  // DEFAULT
  // =========================

  // अगर कोई दिन नहीं बताया गया और
  // आज/कल/परसों भी नहीं है,
  // तो इसे immediate command न बनाएं।

  if (
    !isToday &&
    !isTomorrow &&
    !isDayAfterTomorrow
  ) {

    return {

      type: "SCHEDULE",

      action,

      error: "Day not specified"

    };

  }

  // =========================
  // DAY
  // =========================

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];

  const day = dayNames[
    date.getDay()
  ];

  // =========================
  // ISO TIME
  // =========================

  const scheduledAt = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours() - 5,
      date.getMinutes() - 30,
      0,
      0
    )
  ).toISOString();

  // =========================
  // RESULT
  // =========================

  return {

    type: "SCHEDULE",

    action,

    scheduledAt,

    hour,

    minute,

    day

  };

}


module.exports = {
  parseVoiceSchedule
};
