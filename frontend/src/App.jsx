import { useEffect, useRef, useState } from "react";

import ManualControl from "./components/ManualControl";
import Schedule from "./components/Schedule";
import HistoryCard from "./components/HistoryCard";
import StatsCard from "./components/StatsCard";
import DeviceConnection from "./components/DeviceConnection";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

import { authFetch, getDevice } from "./api";
import { account } from "./appwrite";
import WelcomeHeader from "./components/WelcomeHeader";
import DeviceSelector from "./components/DeviceSelector";
import QuickControls from "./components/QuickControls";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [user, setUser] = useState(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    return localStorage.getItem("geminiPumpSelectedDeviceId") || null;
  });
  const [deviceName, setDeviceName] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [deviceStates, setDeviceStates] = useState({});
  const [deviceToggleLoading, setDeviceToggleLoading] = useState({});
  const [deviceToggleError, setDeviceToggleError] = useState({});
  const [deviceOnlineStates, setDeviceOnlineStates] = useState({});
  const [pendingDeviceState, setPendingDeviceState] = useState({});
  // Global floating Toast notification
  const [toast, setToast] = useState(null);

  // Auto-hide Toast after exactly 3 seconds.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);


  // Keeps the desired state while a command is settling on the device.
  const pendingDeviceStates = useRef({});

  async function loadDeviceName(deviceId = selectedDeviceId) {
    if (!deviceId) return;

    try {
      const res = await authFetch(
        `/api/device/${deviceId}?t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Device API error");
      }

      const data = await res.json();

      setDeviceName(
        data.deviceName ||
        data.deviceId ||
        deviceId
      );
    } catch (err) {
      console.error("Device name error:", err);
    }
  }

  async function loadSharedDeviceState(deviceId) {
    if (!deviceId) return;

    try {
      const device = await getDevice(deviceId);

      if (!device || device.success === false) {
        setDeviceOnlineStates(prev => ({
          ...prev,
          [deviceId]: false
        }));
        return;
      }

      const lastSeenTime = device.lastSeen
        ? new Date(device.lastSeen).getTime()
        : 0;

      const age = Date.now() - lastSeenTime;

      const wifiConnected =
        String(device.wifiStatus || "").toUpperCase() ===
        "CONNECTED";

      const online =
        Boolean(device.lastSeen) &&
        wifiConnected &&
        age >= 0 &&
        age <= 60000;

      setDeviceOnlineStates(prev => ({
        ...prev,
        [deviceId]: online
      }));

      if (!online) return;

      const res = await authFetch(
        `/api/status/${encodeURIComponent(deviceId)}?t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const data = await res.json();

      // Do not let stale status overwrite the optimistic toggle.
      const pendingState = pendingDeviceStates.current[deviceId];

      if (
        data.status === "ON" ||
        data.status === "OFF"
      ) {
        if (pendingState) {
          // The device has reached the state we requested.
          if (data.status === pendingState) {
            delete pendingDeviceStates.current[deviceId];

            setDeviceStates(prev => ({
              ...prev,
              [deviceId]: data.status
            }));
          }

          // Ignore the old opposite state while command is settling.
        } else {
          setDeviceStates(prev => ({
            ...prev,
            [deviceId]: data.status
          }));
        }
      }
    } catch (err) {
      console.log("QuickControls status error:", err);

      setDeviceOnlineStates(prev => ({
        ...prev,
        [deviceId]: false
      }));
    }
  }

  async function toggleDevice(deviceId) {
    if (!deviceId) return;

    if (deviceToggleLoading[deviceId]) {
      return;
    }

    const currentState =
      deviceStates[deviceId] === "ON"
        ? "ON"
        : "OFF";

    const nextCommand =
      currentState === "ON"
        ? "OFF"
        : "ON";

    // Optimistic UI: switch changes immediately on tap.
    // Keep the original state so failed commands can be reverted.
    const originalState = currentState;

    // Remember the state this command is trying to reach.
    pendingDeviceStates.current[deviceId] = nextCommand;
    setPendingDeviceState(prev => ({
      ...prev,
      [deviceId]: nextCommand
    }));

    // Clear any previous toggle error for this device.
    setDeviceToggleError(prev => ({
      ...prev,
      [deviceId]: ""
    }));

    setDeviceStates(prev => ({
      ...prev,
      [deviceId]: nextCommand
    }));

    try {
      setDeviceToggleLoading(prev => ({
        ...prev,
        [deviceId]: true
      }));

      // Keep the same online protection used by ManualControl.
      const device = await getDevice(deviceId);

      if (!device || device.success === false) {
        throw new Error("Device API failed");
      }

      if (!device.lastSeen) {
        console.log(
          "QuickControls: device offline",
          deviceId
        );

        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: originalState
        }));

        setDeviceToggleError(prev => ({
          ...prev,
          [deviceId]: "Device offline or command failed"
        }));
delete pendingDeviceStates.current[deviceId];
        setPendingDeviceState(prev => {
          const next = { ...prev };
          delete next[deviceId];
          return next;
        });
        setToast("Device offline or command failed");

        return;
      }

      const lastSeenTime =
        new Date(device.lastSeen).getTime();

      const age =
        Date.now() - lastSeenTime;

      const wifiConnected =
        String(device.wifiStatus || "").toUpperCase() ===
        "CONNECTED";

      const online =
        wifiConnected &&
        age >= 0 &&
        age <= 60000;

      if (!online) {
        console.log(
          "QuickControls: device offline",
          deviceId
        );

        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: originalState
        }));

        setDeviceToggleError(prev => ({
          ...prev,
          [deviceId]: "Device offline or command failed"
        }));
delete pendingDeviceStates.current[deviceId];
        setPendingDeviceState(prev => {
          const next = { ...prev };
          delete next[deviceId];
          return next;
        });
        setToast("Device offline or command failed");

        return;
      }

      // Give the command request a maximum of 5 seconds.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      let res;

      try {
        res = await authFetch(
          "/api/command/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              deviceId,
              command: nextCommand
            }),
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();

      if (!res.ok) {
        console.error(
          "QuickControls command failed:",
          data
        );

        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: originalState
        }));

        setDeviceToggleError(prev => ({
          ...prev,
          [deviceId]: "Device offline or command failed"
        }));
delete pendingDeviceStates.current[deviceId];
          setPendingDeviceState(prev => {
            const next = { ...prev };
            delete next[deviceId];
            return next;
          });
delete pendingDeviceStates.current[deviceId];
                    setPendingDeviceState(prev => {
                      const next = { ...prev };
                      delete next[deviceId];
                      return next;
                    });
                    setToast("Device offline or command failed");

        return;
      }

      if (data.ignored) {
        if (
          data.status === "ON" ||
          data.status === "OFF"
        ) {
          delete pendingDeviceStates.current[deviceId];
          setPendingDeviceState(prev => {
            const next = { ...prev };
            delete next[deviceId];
            return next;
          });

          setDeviceStates(prev => ({
            ...prev,
            [deviceId]: data.status
          }));
        }

        return;
      }

      if (data.$id) {
        // Keep the requested state visible while the device settles.
        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: nextCommand
        }));

        // Confirm the real device state shortly after.
        setTimeout(() => {
          loadSharedDeviceState(deviceId);
        }, 3000);

        // Safety timeout: never keep a pending state forever.
        setTimeout(() => {
          if (pendingDeviceStates.current[deviceId] === nextCommand) {
            delete pendingDeviceStates.current[deviceId];
            loadSharedDeviceState(deviceId);
          }
        }, 10000);

        setRefresh(prev => !prev);
      }
    } catch (err) {
      console.error(
        "QuickControls toggle error:",
        err
      );

      setDeviceStates(prev => ({
        ...prev,
        [deviceId]: originalState
      }));

      setDeviceToggleError(prev => ({
        ...prev,
        [deviceId]: "Device offline or command failed"
      }));
delete pendingDeviceStates.current[deviceId];
        setPendingDeviceState(prev => {
          const next = { ...prev };
          delete next[deviceId];
          return next;
        });
        setToast("Device offline or command failed");
    } finally {
      setDeviceToggleLoading(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  }

  // Restore existing Appwrite login session on app start
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const currentUser = await account.get();

        if (active) {
          setUser(currentUser);
        }
      } catch (err) {
        console.log("No active login session");
      } finally {
        if (active) {
          setSessionChecking(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || devices.length === 0) {
      return;
    }

    devices.forEach(device => {
      const deviceId =
        device.deviceId || device.$id;

      if (deviceId) {
        loadSharedDeviceState(deviceId);
      }
    });

    // Dashboard status is loaded once when devices/user become available.
    // Do NOT poll every 5 seconds here — this prevents unnecessary Appwrite reads.
    // Status is refreshed again naturally when the page is manually refreshed.

  }, [user, devices]);

  function refreshStatus() {
    setRefresh(prev => !prev);
    loadDeviceName(selectedDeviceId);
  }

  async function handleDeviceChange(deviceId) {
    if (!deviceId) return;

    // Keep the complete dashboard skeleton visible while switching devices.
    setDeviceLoading(true);
    setDeviceName("");
    setSelectedDeviceId(deviceId);
    localStorage.setItem("geminiPumpSelectedDeviceId", deviceId);
    setRefresh(prev => !prev);

    try {
      await loadDeviceName(deviceId);
    } finally {
      // Existing dashboard skeleton is removed only after the new device name loads.
      setDeviceLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !selectedDeviceId) return;

    // Load selected device name when the device changes.
    // No 5-second polling — device name does not need continuous reads.
    loadDeviceName(selectedDeviceId);
  }, [user, selectedDeviceId]);

  if (sessionChecking) {
    return (
      <div className="premium-session-loading">
        <div className="premium-session-loader">
          <div className="premium-session-orbit premium-session-orbit-1" />
          <div className="premium-session-orbit premium-session-orbit-2" />
          <div className="premium-session-core">
            <div className="premium-session-shine" />
          </div>
        </div>

        <div className="premium-session-text">SUNIL</div>
        <div className="premium-session-subtext">Preparing your experience</div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        {showRegister ? (
          <Register
            onRegistered={() => setShowRegister(false)}
            onBackToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login
            onLogin={setUser}
            onRegister={() => setShowRegister(true)}
          />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">

      {toast && (
        <div className="global-toast" role="alert">
          <span className="global-toast-icon" aria-hidden="true">
            !
          </span>
          <span>{toast}</span>
        </div>
      )}

      <WelcomeHeader user={user} onLogout={() => setUser(null)} onUserUpdate={setUser} />

      <DeviceSelector
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
        refresh={refresh}
        onDevicesLoaded={(list) => {
          setDevices(list);
          setDeviceLoading(false);
        }}
      />

      <QuickControls
        devices={devices}
        deviceStates={deviceStates}
        deviceOnlineStates={deviceOnlineStates}
        onToggleDevice={toggleDevice}
        loading={deviceLoading}
      />

      {deviceLoading ? (
        <div className="device-switch-skeleton" aria-label="Loading device">
          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block" />
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-button" />
          </div>

          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-chart" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-short" />
          </div>

          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-form" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-short" />
          </div>

          <div className="skeleton-card skeleton-full">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-history" />
            <div className="skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="grid">

          <div className="card">
            <ManualControl
              onCommandSent={refreshStatus}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
              sharedIsOn={deviceStates[selectedDeviceId] === "ON"}
              onSharedToggle={toggleDevice}
              toggleLoading={!!deviceToggleLoading[selectedDeviceId]}
              toggleError={deviceToggleError[selectedDeviceId] || ""}
              pendingDeviceState={pendingDeviceState[selectedDeviceId] || ""}
            />
          </div>

          <div className="card">
            <StatsCard
              refresh={refresh}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

          <div className="card">
            <Schedule
              refresh={refresh}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

          <div className="card full">
            <HistoryCard
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

        </div>
      )}

      </div>
    </ErrorBoundary>
  );
}

export default App;
