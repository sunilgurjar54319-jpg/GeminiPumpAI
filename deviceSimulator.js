const { getCommand, completeCommand } = require("./services/commandService");
const { updateStatus } = require("./services/statusService");
const fs = require("fs");

const DEVICE_ID = "PUMP001";

let busy = false;
let pumpState = "OFF";

const STATE_FILE = "./device_state.json";


// Load previous relay state
try {

  if (fs.existsSync(STATE_FILE)) {

    const saved = JSON.parse(
      fs.readFileSync(STATE_FILE)
    );

    if (
      saved.state === "ON" ||
      saved.state === "OFF"
    ) {

      pumpState = saved.state;

    }

  }

} catch(e) {

  console.log(
    "State load error:",
    e.message
  );

}


// Save relay state
function saveState(){

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({
      state:pumpState,
      updatedAt:new Date().toISOString()
    })
  );

}


async function syncBootStatus() {

  try {

    await updateStatus(
      DEVICE_ID,
      pumpState
    );

    console.log(
      `📡 Device Status Synced: ${DEVICE_ID} → ${pumpState}`
    );

  } catch (e) {

    console.log(
      "⚠ Status Sync Error:",
      e.message
    );

  }

}


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

      pumpState = "ON";

      saveState();

      console.log("🟢 Pump ON");

    }


    if (command.command === "OFF") {

      pumpState = "OFF";

      saveState();

      console.log("🔴 Pump OFF");

    }


    await completeCommand(command.$id);

    await syncBootStatus();

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

// =========================================
// Startup
// =========================================

(async () => {

  console.log("🔄 Boot Recovery Check...");

  try {

    await syncBootStatus();

    await checkCommand();

  } catch (e) {

    console.log("Boot Recovery:", e.message);

  }

  setInterval(async () => {

    try {

      await checkCommand();

    } catch (e) {

      console.log("Retry:", e.message);

    }

  }, 2000);

})();
