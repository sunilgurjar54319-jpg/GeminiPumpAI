import { useEffect, useState } from "react";

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
import { startAuthentication } from "@simplewebauthn/browser";

function App() {
  const [user, setUser] = useState(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    return localStorage.getItem("geminiPumpSelectedDeviceId") || null;
  });
  const [deviceName, setDeviceName] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceStates, setDeviceStates] = useState({});
  const [deviceToggleLoading, setDeviceToggleLoading] = useState({});
  const [deviceOnlineStates, setDeviceOnlineStates] = useState({});

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

      if (data.status === "ON" || data.status === "OFF") {
        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: data.status
        }));
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
        return;
      }

      const res = await authFetch(
        "/api/command/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            deviceId,
            command: nextCommand
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(
          "QuickControls command failed:",
          data
        );
        return;
      }

      if (data.ignored) {
        if (
          data.status === "ON" ||
          data.status === "OFF"
        ) {
          setDeviceStates(prev => ({
            ...prev,
            [deviceId]: data.status
          }));
        }

        return;
      }

      if (data.$id) {
        // Optimistic update exactly like ManualControl.
        setDeviceStates(prev => ({
          ...prev,
          [deviceId]: nextCommand
        }));

        // Confirm the real device state shortly after.
        setTimeout(() => {
          loadSharedDeviceState(deviceId);
        }, 3000);

        setRefresh(prev => !prev);
      }
    } catch (err) {
      console.error(
        "QuickControls toggle error:",
        err
      );
    } finally {
      setDeviceToggleLoading(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  }

  // Restore existing Appwrite login session on app start
  // If biometric login is enabled, require biometric verification first.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const currentUser = await account.get();

        if (!active) return;

        const biometricEnabled =
          currentUser?.prefs?.biometricEnabled === true;

        // Biometric disabled: keep the existing behavior.
        if (!biometricEnabled) {
          setUser(currentUser);
          return;
        }

        // Biometric enabled: verify the device before opening Dashboard.
        if (!window.isSecureContext) {
          console.error(
            "Biometric startup login requires HTTPS."
          );
          await account.deleteSession("current").catch(() => {});
          return;
        }

        if (!window.PublicKeyCredential) {
          console.error(
            "WebAuthn is not supported on this device/browser."
          );
          await account.deleteSession("current").catch(() => {});
          return;
        }

        const available =
          await PublicKeyCredential
            .isUserVerifyingPlatformAuthenticatorAvailable();

        if (!available) {
          console.error(
            "No platform biometric authenticator available."
          );
          await account.deleteSession("current").catch(() => {});
          return;
        }

        const optionsResponse = await fetch(
          "https://geminipumpai.onrender.com/api/biometric/login/options",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        const optionsData =
          await optionsResponse.json();

        if (
          !optionsResponse.ok ||
          !optionsData.success
        ) {
          throw new Error(
            optionsData.error ||
            "Biometric login options failed."
          );
        }

        const authenticationResponse =
          await startAuthentication({
            optionsJSON: optionsData.options
          });

        const verifyResponse = await fetch(
          "https://geminipumpai.onrender.com/api/biometric/login/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(authenticationResponse)
          }
        );

        const verifyData =
          await verifyResponse.json();

        if (
          !verifyResponse.ok ||
          !verifyData.success ||
          !verifyData.jwt
        ) {
          throw new Error(
            verifyData.error ||
            "Biometric authentication failed."
          );
        }

        // Store the fresh backend JWT returned by biometric login.
        sessionStorage.setItem(
          "geminiPumpJWT",
          verifyData.jwt
        );

        if (active) {
          setUser(currentUser);
        }

      } catch (err) {
        console.error(
          "Startup biometric login failed:",
          err
        );

        // Do not open Dashboard when biometric verification fails/cancels.
        await account.deleteSession("current").catch(() => {});
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

    const timer = setInterval(() => {
      devices.forEach(device => {
        const deviceId =
          device.deviceId || device.$id;

        if (deviceId) {
          loadSharedDeviceState(deviceId);
        }
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [user, devices]);

  function refreshStatus() {
    setRefresh(prev => !prev);
    loadDeviceName(selectedDeviceId);
  }

  async function handleDeviceChange(deviceId) {
    if (!deviceId) return;

    // Purane device ka data turant hide karke skeleton dikhao
    setDeviceLoading(true);
    setDeviceName("");
    setSelectedDeviceId(deviceId);
    localStorage.setItem("geminiPumpSelectedDeviceId", deviceId);
    setRefresh(prev => !prev);

    try {
      await loadDeviceName(deviceId);
    } finally {
      // Naye device ka naam/data load hone ke baad skeleton hatao
      setDeviceLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !selectedDeviceId) return;

    loadDeviceName(selectedDeviceId);

    const timer = setInterval(
      () => loadDeviceName(selectedDeviceId),
      5000
    );

    return () => clearInterval(timer);
  }, [user, selectedDeviceId]);

  if (sessionChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div>Loading...</div>
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

      <WelcomeHeader user={user} onLogout={() => setUser(null)} onUserUpdate={setUser} />

      <DeviceSelector
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
        refresh={refresh}
        onDevicesLoaded={setDevices}
      />

      <QuickControls
        devices={devices}
        deviceStates={deviceStates}
        deviceOnlineStates={deviceOnlineStates}
        onToggleDevice={toggleDevice}
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
