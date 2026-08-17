function understandCommand(text, deviceName) {

  const command = String(text || "")
    .toLowerCase()
    .trim();

  const name = String(deviceName || "")
    .toLowerCase()
    .trim();

  // Device name required
  if (!name) {
    return null;
  }

  // =========================================
  // DEVICE NAME ALIASES
  // =========================================
  // Hindi voice recognition:
  // Switch -> स्विच
  // Motor  -> मोटर
  // Pump   -> पंप / पम्प
  // =========================================

  const deviceNameAliases = [name];

  if (name === "switch") {
    deviceNameAliases.push("स्विच");
  }

  if (name === "motor") {
    deviceNameAliases.push("मोटर");
  }

  if (name === "pump") {
    deviceNameAliases.push("पंप");
    deviceNameAliases.push("पम्प");
  }

  const deviceNameMatched =
    deviceNameAliases.some(
      alias => alias && command.includes(alias)
    );

  if (!deviceNameMatched) {
    return null;
  }

  // =========================================
  // ON / START
  // =========================================

  const onWords = [
    "on",
    "start",
    "chalu",
    "chaalu",
    "chaloo",
    "चालू",
    "चालु",
    "चालू करो",
    "चालू कर",
    "शुरू",
    "शुरु",
    "चलाओ",
    "चलाओ",
    "चलाना"
  ];

  if (onWords.some(word => command.includes(word))) {
    return "ON";
  }

  // =========================================
  // OFF / STOP
  // =========================================

  const offWords = [
    "off",
    "stop",
    "band",
    "bnd",
    "बंद",
    "बन्द",
    "बंद करो",
    "बन्द करो",
    "रोक",
    "रुको",
    "रोक दो",
    "बंद कर"
  ];

  if (offWords.some(word => command.includes(word))) {
    return "OFF";
  }

  return null;
}

module.exports = {
  understandCommand
};
