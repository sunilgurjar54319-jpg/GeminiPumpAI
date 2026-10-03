const WebSocket = require("ws");
const { heartbeatDevice } = require("./services/deviceService");
const { updateStatus } = require("./services/statusService");
const { getRecoveryState } = require("./services/recoveryService");

const deviceConnections = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("[WS] ESP32 connected");

    ws.send(JSON.stringify({
      type: "connected",
      message: "Gemini Pump AI WebSocket connected"
    }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.action === "heartbeat") {
          const devices = Array.isArray(message.devices)
            ? message.devices
            : message.deviceId
              ? [message.deviceId]
              : [];

          for (const deviceId of devices) {
            if (!deviceId) continue;

            if (deviceConnections.get(deviceId) !== ws) {
              continue;
            }

            heartbeatDevice(deviceId, "CONNECTED")
              .then(() => {
                console.log(`[WS] Heartbeat ONLINE: ${deviceId}`);
              })
              .catch((error) => {
                console.error(
                  `[WS] Heartbeat failed: ${deviceId} | ${error.message}`
                );
              });
          }

          return;
        }

        if (message.action === "recoveryComplete") {
          const deviceId = message.deviceId;
          const status = String(message.status || "").toUpperCase();

          if (!deviceId || (status !== "ON" && status !== "OFF")) {
            console.error("[WS] Invalid recoveryComplete message");
            return;
          }

          if (deviceConnections.get(deviceId) !== ws) {
            console.error(`[WS] Unauthorized recoveryComplete: ${deviceId}`);
            return;
          }

          updateStatus(deviceId, status)
            .then(() => {
              console.log(
                `[WS] Recovery completed: ${deviceId} -> ${status}`
              );
            })
            .catch((error) => {
              console.error(
                `[WS] Recovery status failed: ${deviceId} | ${error.message}`
              );
            });

          return;
        }

        if (message.action === "commandComplete") {
          const deviceId = message.deviceId;
          const commandId = message.commandId;

          if (!deviceId || !commandId) {
            console.error("[WS] Invalid commandComplete message");
            return;
          }

          if (deviceConnections.get(deviceId) !== ws) {
            console.error(`[WS] Unauthorized commandComplete: ${deviceId}`);
            return;
          }

          const { completeCommand } = require("./services/commandService");

          completeCommand(commandId)
            .then(() => {
              console.log(
                `[WS] Command completed: ${commandId} -> ${deviceId}`
              );
            })
            .catch((error) => {
              console.error(
                `[WS] Command completion failed: ${commandId} | ${error.message}`
              );
            });

          return;
        }

        if (message.action === "register") {
          const devices = Array.isArray(message.devices)
            ? message.devices
            : message.deviceId
              ? [message.deviceId]
              : [];

          for (const deviceId of devices) {
            if (!deviceId) continue;

            deviceConnections.set(deviceId, ws);
            console.log(`[WS] Device registered: ${deviceId}`);

            heartbeatDevice(deviceId, "CONNECTED")
              .then(() => {
                console.log(`[WS] Presence ONLINE: ${deviceId}`);
              })
              .catch((error) => {
                console.error(
                  `[WS] Presence ONLINE failed: ${deviceId} | ${error.message}`
                );
              });

            getRecoveryState(deviceId)
              .then((recovery) => {
                if (ws.readyState !== WebSocket.OPEN) return;

                ws.send(JSON.stringify({
                  type: "recovery",
                  deviceId,
                  command: recovery.command
                }));

                console.log(
                  `[WS] Recovery sent: ${recovery.command} -> ${deviceId}`
                );
              })
              .catch((error) => {
                console.error(
                  `[WS] Recovery failed: ${deviceId} | ${error.message}`
                );
              });
          }

          ws.send(JSON.stringify({
            type: "registered",
            devices
          }));

          return;
        }

        console.log("[WS] Received:", message);
      } catch (error) {
        console.error("[WS] Invalid message:", error.message);
      }
    });

    ws.on("close", () => {
      for (const [deviceId, connection] of deviceConnections.entries()) {
        if (connection === ws) {
          deviceConnections.delete(deviceId);
          console.log(`[WS] Device disconnected: ${deviceId}`);

          heartbeatDevice(deviceId, "DISCONNECTED")
            .then(() => {
              console.log(`[WS] Presence OFFLINE: ${deviceId}`);
            })
            .catch((error) => {
              console.error(
                `[WS] Presence OFFLINE failed: ${deviceId} | ${error.message}`
              );
            });
        }
      }

      console.log("[WS] ESP32 disconnected");
    });

    ws.on("error", (error) => {
      console.error("[WS] Error:", error.message);
    });
  });

  console.log("[WS] WebSocket server initialized");
  return wss;
}

function sendCommandToDevice(deviceId, command, commandId) {
  const ws = deviceConnections.get(deviceId);

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  ws.send(JSON.stringify({
    type: "command",
    deviceId,
    command,
    commandId
  }));

  console.log(
    `[WS] Command sent: ${command} -> ${deviceId} | commandId=${commandId}`
  );

  return true;
}

module.exports = {
  setupWebSocket,
  sendCommandToDevice
};
