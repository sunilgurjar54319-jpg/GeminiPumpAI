function understandCommand(text) {

  const command = text.toLowerCase();

  if (
    command.includes("chalu") ||
    command.includes("start") ||
    command.includes("on") ||
    command.includes("चालू")
  ) {
    return "ON";
  }

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
