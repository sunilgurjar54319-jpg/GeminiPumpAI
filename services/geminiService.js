function understandCommand(text, deviceName) {

  const command = String(text || "")
    .toLowerCase()
    .trim();

  const name = String(deviceName || "")
    .toLowerCase()
    .trim();

  // Device name ke bina command allowed nahi hai
  if (!name) {
    return null;
  }

  // Hindi voice aliases for common device names.
  // Edited English device name और उसके common Hindi रूप दोनों स्वीकार होंगे.
  const hindiDeviceAliases = {
    switch: ["स्विच"],
    motor: ["मोटर"],
    pump: ["पंप", "पम्प"],
    controller: ["कंट्रोलर"],
    machine: ["मशीन"]
  };

  const deviceNameAliases = [
    name,
    ...(hindiDeviceAliases[name] || [])
  ];

  const deviceNameMatched = deviceNameAliases.some(
    alias => alias && command.includes(alias)
  );

  if (!deviceNameMatched) {
    return null;
  }

  // =========================
  // ON Command
  // =========================

  if (
    command.includes("chalu") ||
    command.includes("start") ||
    command.includes("on") ||
    command.includes("चालू")
  ) {
    return "ON";
  }

  // =========================
  // OFF Command
  // =========================

  if (
    command.includes("band") ||
    command.includes("stop") ||
    command.includes("off") ||
    command.includes("बंद")
  ) {
    return "OFF";
  }

  return null;
}


module.exports = {
  understandCommand
};
