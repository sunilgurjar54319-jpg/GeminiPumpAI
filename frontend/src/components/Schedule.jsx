import { useEffect, useState } from "react";
import {
  saveSchedule,
  getSchedules,
  deleteSchedule,
  updateSchedule
} from "../api";

function Schedule() {

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [schedules, setSchedules] = useState([]);

  const [editingId, setEditingId] = useState(null);

  async function loadSchedules() {

    try {

      const data = await getSchedules("PUMP001");

      if (data.success) {
        setSchedules(data.schedules);
      }

    } catch (err) {
      console.log(err);
    }

  }

  async function createSchedule() {

    try {

      const result = await saveSchedule({
        deviceId: "PUMP001",
        startTime,
        endTime,
        days: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        enabled: true
      });

      if (result.success) {

        setMessage("✅ Schedule Saved");

        setStartTime("");
        setEndTime("");

        loadSchedules();

      }

    } catch (err) {

      console.log(err);
      setMessage("❌ Server Error");

    }

  }

  async function removeSchedule(id) {

    const result = await deleteSchedule(id);

    if (result.success) {

      loadSchedules();

    }

  }

  function editSchedule(item) {

    setEditingId(item.$id);

    setStartTime(item.startTime);

    setEndTime(item.endTime);

  }

  async function updateCurrentSchedule() {

    const result = await updateSchedule(editingId, {

      startTime,

      endTime,

      days: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",

      enabled: true

    });

    if (result.success) {

      setMessage("✅ Schedule Updated");

      setEditingId(null);

      setStartTime("");

      setEndTime("");

      loadSchedules();

    }

  }

  useEffect(() => {

    loadSchedules();

  }, []);
  return (

    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "15px",
        marginTop: "20px"
      }}
    >

      <h2>⏰ Pump Schedule</h2>

      <p>Start Time</p>

      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      <p>End Time</p>

      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      <br />
      <br />

      {editingId ? (

        <button onClick={updateCurrentSchedule}>
          ✏️ Update Schedule
        </button>

      ) : (

        <button onClick={createSchedule}>
          💾 Save Schedule
        </button>

      )}

      <p>{message}</p>

      <hr />

      <h3>📋 Saved Schedules</h3>

      {schedules.length === 0 ? (

        <p>No Schedule Found</p>

      ) : (

        schedules.map((item) => (

          <div
            key={item.$id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "10px"
            }}
          >

            <b>
              {item.startTime} → {item.endTime}
            </b>

            <br />

            Days: {item.days}

            <br />

            Status: {item.enabled ? "✅ Enabled" : "❌ Disabled"}

            <br />
            <br />

            <button
              onClick={() => editSchedule(item)}
              style={{ marginRight: "10px" }}
            >
              ✏️ Edit
            </button>

            <button
              onClick={() => removeSchedule(item.$id)}
            >
              🗑️ Delete
            </button>

          </div>

        ))

      )}

    </div>

  );

}

export default Schedule;
