function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.,!?'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Hindi/English device-name matching.
 *
 * Important:
 * - Configured English device name is always authoritative.
 * - Hindi pronunciation is matched phonetically.
 * - No fixed Fan/Light/Motor/Pump device list is required.
 */
function phonetic(value) {
  let s = normalizeText(value);

  const map = [
    ["क्ष", "ksh"],
    ["त्र", "tr"],
    ["ज्ञ", "gy"],
    ["श्र", "shr"],

    ["अ", "a"],
    ["आ", "a"],
    ["इ", "i"],
    ["ई", "i"],
    ["उ", "u"],
    ["ऊ", "u"],
    ["ए", "e"],
    ["ऐ", "a"],
    ["ओ", "o"],
    ["औ", "au"],

    ["ा", "a"],
    ["ि", "i"],
    ["ी", "i"],
    ["ु", "u"],
    ["ू", "u"],
    ["े", "e"],
    ["ै", "a"],
    ["ो", "o"],
    ["ौ", "au"],

    ["ं", "n"],
    ["ँ", "n"],
    ["ः", "h"],
    ["्", ""],
    ["़", ""],

    ["ख", "kh"],
    ["घ", "gh"],
    ["च", "ch"],
    ["छ", "chh"],
    ["ज", "j"],
    ["झ", "jh"],
    ["ट", "t"],
    ["ठ", "th"],
    ["ड", "d"],
    ["ढ", "dh"],
    ["त", "t"],
    ["थ", "th"],
    ["द", "d"],
    ["ध", "dh"],
    ["न", "n"],
    ["प", "p"],
    ["फ", "f"],
    ["ब", "b"],
    ["भ", "bh"],
    ["म", "m"],
    ["य", "y"],
    ["र", "r"],
    ["ल", "l"],
    ["व", "v"],
    ["श", "sh"],
    ["ष", "sh"],
    ["स", "s"],
    ["ह", "h"],
    ["क", "k"],
    ["ग", "g"],
    ["ङ", "n"],
    ["ण", "n"]
  ];

  for (const [from, to] of map) {
    s = s.split(from).join(to);
  }

  return s
    .replace(/ph/g, "f")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/sh/g, "s")
    .replace(/ch/g, "c")
    .replace(/oo/g, "u")
    .replace(/ee/g, "i")
    .replace(/aa/g, "a")
    .replace(/ou/g, "au")
    .replace(/[^a-z0-9]+/g, "");
}

/*
 * Returns TRUE only when the spoken text contains
 * the configured device name or its phonetic Hindi pronunciation.
 *
 * No fixed device names are used here.
 */
function deviceNameMatches(text, deviceName) {
  const command = normalizeText(text);
  const name = normalizeText(deviceName);

  if (!command || !name) {
    return false;
  }

  // Exact configured name.
  if (command.includes(name)) {
    return true;
  }

  // Common Hindi semantic aliases for configured device names.
  // These aliases apply ONLY to the matching configured device.
  const hindiDeviceAliases = {
    fan: ["फैन", "पंखा"],
    light: ["लाइट", "लाईट"],
    motor: ["मोटर"],
    pump: ["पंप", "पम्प"],
    switch: ["स्विच"],
    controller: ["कंट्रोलर"],
    machine: ["मशीन"]
  };

  const aliases = hindiDeviceAliases[name] || [];

  if (aliases.some(alias => command.includes(alias))) {
    return true;
  }

  const commandPhonetic = phonetic(command);
  const namePhonetic = phonetic(name);

  if (
    commandPhonetic &&
    namePhonetic &&
    commandPhonetic.includes(namePhonetic)
  ) {
    return true;
  }

  return false;
}

function understandCommand(text, deviceName) {
  const command = normalizeText(text);

  if (!deviceNameMatches(command, deviceName)) {
    return null;
  }

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
    "चलाना"
  ];

  if (onWords.some(word => command.includes(word))) {
    return "ON";
  }

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
  understandCommand,
  deviceNameMatches
};
