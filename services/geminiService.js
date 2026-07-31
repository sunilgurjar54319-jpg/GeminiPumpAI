function understandCommand(text) {

  const command = text.toLowerCase();

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
