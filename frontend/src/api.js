const API = "https://geminipumpai.onrender.com";


// Gemini Voice Command
export async function sendVoice(text) {
  const res = await fetch(`${API}/api/gemini/voice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  return await res.json();
}


// Save Schedule
export async function saveSchedule(data) {
  const res = await fetch(`${API}/api/schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return await res.json();
}


// Get Schedule
export async function getSchedules(deviceId) {
  const res = await fetch(`${API}/api/schedule/${deviceId}`);

  return await res.json();
}


// Update Schedule
export async function updateSchedule(id, data) {
  const res = await fetch(`${API}/api/schedule/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return await res.json();
}


// Delete Schedule
export async function deleteSchedule(id) {
  const res = await fetch(`${API}/api/schedule/${id}`, {
    method: "DELETE"
  });

  return await res.json();
}


// Get Pump Status
export async function getStatus(deviceId) {
  const res = await fetch(`${API}/api/status/${deviceId}`);

  return await res.json();
}


// Get Pump History
export async function getHistory(deviceId) {
  const res = await fetch(`${API}/api/history/${deviceId}`);

  return await res.json();
}


// Clear Pump History
export async function clearHistory(deviceId) {
  const res = await fetch(`${API}/api/history/${deviceId}`, {
    method: "DELETE"
  });

  return await res.json();
}
export async function getStats(deviceId){

const res = await fetch(
`${API}/api/stats/${deviceId}`
);


return await res.json();

}
