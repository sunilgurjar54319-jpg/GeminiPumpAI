const API = "https://geminipumpai.onrender.com";

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

export async function getSchedules(deviceId) {
  const res = await fetch(`${API}/api/schedule/${deviceId}`);
  return await res.json();
}

export async function getStatus(deviceId) {
  const res = await fetch(`${API}/api/status/${deviceId}`);
  return await res.json();
}

export async function getHistory(deviceId) {
  const res = await fetch(`${API}/api/history/${deviceId}`);
  return await res.json();
}
