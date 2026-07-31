const { getCommand, completeCommand } = require("./services/commandService");

const DEVICE_ID = "PUMP001";

let busy = false;

async function checkCommand() {

  if (busy) return;

  busy = true;

  try {

    const command = await getCommand(DEVICE_ID);

    if (!command || command.command === "NONE") {
      busy = false;
      return;
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📩 Received Command :", command.command);

    if (command.command === "ON") {
      console.log("🟢 Pump ON");
    }

    if (command.command === "OFF") {
      console.log("🔴 Pump OFF");
    }

    await completeCommand(command.$id);

    console.log("✅ Command Completed");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {

    console.log("⚠ Simulator Error:", error.message);

    // Socket / Network error होने पर crash नहीं होगा
    await new Promise(resolve => setTimeout(resolve, 3000));

  } finally {

    busy = false;

  }

}

console.log("🤖 Device Simulator Running...");
console.log("📡 Waiting for Commands...");

// Startup पर एक बार check
checkCommand();

// हर 5 सेकंड में check
setInterval(checkCommand, 5000);
