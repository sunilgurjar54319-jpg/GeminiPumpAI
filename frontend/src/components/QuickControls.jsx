import React from "react";

function QuickControls({
  devices = [],
  deviceStates = {},
  deviceOnlineStates = {},
  onToggleDevice
}) {
  if (!devices.length) {
    return null;
  }

  return (
    <>
      <style>{`
        .quick-controls {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 4px 2px 10px;
          margin-top: 12px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }

        .quick-controls::-webkit-scrollbar {
          display: none;
        }

        .quick-control-card {
          flex: 0 0 auto;
          min-width: 150px;
          padding: 12px 14px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;

          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.8);

          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.08);

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);

          transition:
            background 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease,
            opacity 0.35s ease,
            filter 0.35s ease;
        }

        /* CONNECTED + OFF */
        .quick-control-card.is-connected.is-off {
          animation: none;
        }

        @keyframes quickNeonRed {
          0% {
            box-shadow:
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 4px rgba(255, 59, 48, 0.25),
              inset 0 0 4px rgba(255, 59, 48, 0.15);
          }

          100% {
            box-shadow:
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 18px rgba(255, 59, 48, 0.65),
              0 0 34px rgba(255, 59, 48, 0.28),
              inset 0 0 14px rgba(255, 59, 48, 0.28);
          }
        }

        /* CONNECTED + ON */
        .quick-control-card.is-connected.is-on {
          background: rgba(255, 255, 255, 0.9);
          animation: none;
        }

        @keyframes quickNeonGreen {
          0% {
            box-shadow:
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 4px rgba(52, 199, 89, 0.25),
              inset 0 0 4px rgba(52, 199, 89, 0.15);
          }

          100% {
            box-shadow:
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 18px rgba(52, 199, 89, 0.65),
              0 0 34px rgba(52, 199, 89, 0.28),
              inset 0 0 14px rgba(52, 199, 89, 0.28);
          }
        }

        /* OFFLINE / DISCONNECTED */
        .quick-control-card.is-offline {
          opacity: 0.5;
          filter: grayscale(100%);
          border: 1px dashed #999;
          pointer-events: none;
          animation: none;
        }

        .quick-control-switch {
          position: relative;
          flex-shrink: 0;
          width: 46px;
          height: 26px;
          padding: 0;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition:
            background 0.25s ease,
            box-shadow 0.25s ease;
        }

        .quick-control-switch.is-off {
          background: #FF3B30;
          box-shadow:
            0 0 7px rgba(255, 59, 48, 0.45);
        }

        .quick-control-switch.is-on {
          background: #34C759;
          box-shadow:
            0 0 7px rgba(52, 199, 89, 0.45);
        }

        .quick-control-knob {
          position: absolute;
          top: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 2px 6px rgba(0, 0, 0, 0.2);
          transition: left 0.2s ease;
        }
      `}</style>

      <div className="quick-controls">
        {devices.map((device) => {
          const deviceId =
            device.deviceId || device.$id;

          if (!deviceId) {
            return null;
          }

          const deviceName =
            device.deviceName ||
            device.name ||
            deviceId;

          const isOn =
            deviceStates[deviceId] === "ON";

          const isOnline =
            deviceOnlineStates[deviceId] !== false;

          const cardStateClass = !isOnline
            ? "is-offline"
            : isOn
              ? "is-connected is-on"
              : "is-connected is-off";

          return (
            <div
              key={deviceId}
              className={`quick-control-card ${cardStateClass}`}
            >
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#222"
                }}
                title={deviceName}
              >
                {deviceName}
              </span>

              <button
                type="button"
                className={`quick-control-switch ${
                  isOn ? "is-on" : "is-off"
                }`}
                onClick={() =>
                  onToggleDevice &&
                  onToggleDevice(deviceId)
                }
                aria-label={`Turn ${deviceName} ${
                  isOn ? "OFF" : "ON"
                }`}
              >
                <span
                  className="quick-control-knob"
                  style={{
                    left: isOn ? "23px" : "3px"
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default QuickControls;
