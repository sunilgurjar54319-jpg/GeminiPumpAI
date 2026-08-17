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

  // Device name voice text me hona zaroori hai
  // Hindi voice recognition me "Switch" aksar "स्विच" aata hai.
  const deviceNameAliases = [name];

  if (name === "switch") {
    deviceNameAliases.push("स्विच");
  }

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
