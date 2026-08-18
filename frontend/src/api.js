const API = "https://geminipumpai.onrender.com";

export async function authFetch(path, options = {}) {
  const jwt = sessionStorage.getItem("geminiPumpJWT");

  const headers = {
    ...(options.headers || {})
  };

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API}${path}`, {
    ...options,
    headers
  });
}



// =========================================
// DEVICE FETCH
// Device heartbeat/status read APIs
// JWT ki zarurat nahi
// =========================================
export async function deviceFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });
}


// =========================================
// GET DEVICE STATUS
// =========================================
export async function getDevice(deviceId) {
  const res = await deviceFetch(
    `/api/device/${deviceId}`
  );

  if (!res.ok) {
    throw new Error(
      `Device API HTTP ${res.status}`
    );
  }

  return await res.json();
}

// =========================================
// Gemini Voice Command
// =========================================
export async function sendVoice(text) {
  const res = await authFetch("/api/gemini/voice", {
    method: "POST",
    body: JSON.stringify({ text })
  });

  return await res.json();
}


// =========================================
// Save Schedule
// =========================================
export async function saveSchedule(data) {
  const res = await authFetch("/api/schedule", {
    method: "POST",
    body: JSON.stringify(data)
  });

  return await res.json();
}


// =========================================
// Get Schedule
// =========================================
export async function getSchedules(deviceId) {
  const res = await authFetch(`/api/schedule/${deviceId}`);

  return await res.json();
}


// =========================================
// Update Schedule
// =========================================
export async function updateSchedule(id, data) {
  const res = await authFetch(`/api/schedule/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });

  return await res.json();
}


// =========================================
// Delete Schedule
// =========================================
export async function deleteSchedule(id) {
  const res = await authFetch(`/api/schedule/${id}`, {
    method: "DELETE"
  });

  return await res.json();
}


// =========================================
// Get Pump Status
// =========================================
export async function getStatus(deviceId) {
  const res = await authFetch(`/api/status/${deviceId}`);

  return await res.json();
}


// =========================================
// Get Pump History
// =========================================
export async function getHistory(deviceId) {
  const res = await authFetch(`/api/history/${deviceId}`);

  return await res.json();
}


// =========================================
// Clear Pump History
// =========================================
export async function clearHistory(deviceId) {
  const res = await authFetch(`/api/history/${deviceId}`, {
    method: "DELETE"
  });

  return await res.json();
}


// =========================================
// Get Stats
// =========================================
export async function getStats(deviceId) {
  const res = await authFetch(`/api/stats/${deviceId}`);

  return await res.json();
}
