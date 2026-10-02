const WebSocket = require("ws");
const { heartbeatDevice } = require("./services/deviceService");

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
