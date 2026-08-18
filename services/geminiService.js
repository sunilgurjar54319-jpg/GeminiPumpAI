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
  // SAFE DYNAMIC DEVICE NAME MATCHING
  // =========================================
  // Configured device name is mandatory.
  // Exact English name is accepted.
  // Common Hindi pronunciations are accepted only
  // for the matching configured English name.
  //
  // IMPORTANT:
  // Do NOT use generic motor/pump/light words for
  // another configured device.
  // =========================================

  const normalizedCommand =
    String(command || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedName =
    String(name || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  if (!normalizedName) {
    return null;
  }

  const hindiAliases = {
    light: ["लाइट", "लाईट"],
    motor: ["मोटर"],
    pump: ["पंप", "पम्प"],
    fan: ["फैन", "पंखा"],
    switch: ["स्विच"],
    controller: ["कंट्रोलर"],
    machine: ["मशीन"]
  };

  const aliases = [
    normalizedName,
    ...(hindiAliases[normalizedName] || [])
  ];

  const deviceNameMatched = aliases.some(alias => {
    return alias &&
      normalizedCommand.includes(alias);
  });

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
