import { useEffect, useState } from "react";
import {
  saveSchedule,
  getSchedules,
  deleteSchedule,
  updateSchedule
} from "../api";

const DAYS = [
  ["Mon", "Mon"],
  ["Tue", "Tue"],
  ["Wed", "Wed"],
  ["Thu", "Thu"],
  ["Fri", "Fri"],
  ["Sat", "Sat"],
  ["Sun", "Sun"]
];

function Schedule() {

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [command, setCommand] = useState("ON");

  const [selectedDays, setSelectedDays] = useState([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ]);

  const [message, setMessage] = useState("");
  const [schedules, setSchedules] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);


  // =========================
  // Load Schedules
  // =========================

  async function loadSchedules() {

    try {

      const data = await getSchedules("PUMP001");

      if (data.success) {
        setSchedules(data.schedules);
      }

    } catch (err) {

      console.log(err);
      setMessage("❌ Schedule Load Failed");

    }

  }


  // =========================
  // Toggle Day
  // =========================

  function toggleDay(day) {

    setSelectedDays(prev => {

      if (prev.includes(day)) {

        return prev.filter(d => d !== day);

      }

      return [...prev, day];

    });

  }


  // =========================
  // Save Schedule
  // =========================

  async function createSchedule() {

    if (!startTime || !endTime) {

      setMessage("⚠️ Start और End time चुनें");

      return;

    }

    if (selectedDays.length === 0) {

      setMessage("⚠️ कम से कम एक दिन चुनें");

      return;

    }

    setLoading(true);

    try {

      const result = await saveSchedule({

        deviceId: "PUMP001",

        startTime,

        endTime,

        days: selectedDays.join(","),

        enabled: true,

        command: command,

        scheduledDate: null

      });


      if (result.success) {

        setMessage(
          command === "ON"
            ? "🟢 ON Schedule Saved"
            : "🔴 OFF Schedule Saved"
        );

        resetForm();

        await loadSchedules();

      } else {

        setMessage(
          "❌ " + (result.error || "Schedule Save Failed")
        );

      }

    } catch (err) {

      console.log(err);

      setMessage("❌ Server Error");

    }

    setLoading(false);

  }


  // =========================
  // Delete
  // =========================

  async function removeSchedule(id) {

    try {

      const result = await deleteSchedule(id);

      if (result.success) {

        setMessage("🗑️ Schedule Deleted");

        await loadSchedules();

      }

    } catch (err) {

      console.log(err);

      setMessage("❌ Delete Failed");

    }

  }


  // =========================
  // Edit
  // =========================

  function editSchedule(item) {

    setEditingId(item.$id);

    setStartTime(item.startTime || "");
    setEndTime(item.endTime || "");

    setCommand(
      item.command === "OFF"
        ? "OFF"
        : "ON"
    );

    setSelectedDays(
      item.days
        ? item.days.split(",").filter(Boolean)
        : []
    );

    setMessage("✏️ Editing Schedule");

  }


  // =========================
  // Update
  // =========================

  async function updateCurrentSchedule() {

    if (!editingId) return;

    if (!startTime || !endTime) {

      setMessage("⚠️ Start और End time चुनें");

      return;

    }

    if (selectedDays.length === 0) {

      setMessage("⚠️ कम से कम एक दिन चुनें");

      return;

    }

    setLoading(true);

    try {

      const result = await updateSchedule(
        editingId,
        {

          startTime,

          endTime,

          days: selectedDays.join(","),

          enabled: true,

          command,

          scheduledDate: null

        }
      );


      if (result.success) {

        setMessage("✅ Schedule Updated");

        resetForm();

        await loadSchedules();

      } else {

        setMessage(
          "❌ " + (result.error || "Update Failed")
        );

      }

    } catch (err) {

      console.log(err);

      setMessage("❌ Server Error");

    }

    setLoading(false);

  }


  // =========================
  // Enable / Disable
  // =========================

  async function toggleSchedule(item) {

    try {

      const result = await updateSchedule(

        item.$id,

        {

          startTime: item.startTime,

          endTime: item.endTime,

          days: item.days,

          enabled: !item.enabled,

          command: item.command || "",

          scheduledDate: item.scheduledDate || null

        }

      );


      if (result.success) {

        setMessage(
          result.schedule.enabled
            ? "▶️ Schedule Enabled"
            : "⏸️ Schedule Disabled"
        );

        await loadSchedules();

      }

    } catch (err) {

      console.log(err);

      setMessage("❌ Status Update Failed");

    }

  }


  // =========================
  // Reset Form
  // =========================

  function resetForm() {

    setEditingId(null);

    setStartTime("");
    setEndTime("");

    setCommand("ON");

    setSelectedDays([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun"
    ]);

  }


  // =========================
  // Load on Start
  // =========================

  useEffect(() => {

    loadSchedules();

  }, []);


  // =========================
  // UI
  // =========================

  return (

    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "15px",
        padding: "20px",
        marginTop: "20px"
      }}
    >

      <h2>⏰ Pump Schedule</h2>


      {/* Command */}

      <p>
        <b>Command</b>
      </p>

      <button

        onClick={() => setCommand("ON")}

        style={{
          padding: "10px 20px",
          marginRight: "10px",
          borderRadius: "8px",
          border: "none",
          background:
            command === "ON"
              ? "#2e7d32"
              : "#ddd",
          color:
            command === "ON"
              ? "white"
              : "black"
        }}

      >

        🟢 ON

      </button>


      <button

        onClick={() => setCommand("OFF")}

        style={{
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          background:
            command === "OFF"
              ? "#d32f2f"
              : "#ddd",
          color:
            command === "OFF"
              ? "white"
              : "black"
        }}

      >

        🔴 OFF

      </button>


      {/* Time */}

      <p>
        <b>Start Time</b>
      </p>

      <input

        type="time"

        value={startTime}

        onChange={(e) =>
          setStartTime(e.target.value)
        }

        style={{
          padding: "10px",
          fontSize: "17px"
        }}

      />


      <p>
        <b>End Time</b>
      </p>

      <input

        type="time"

        value={endTime}

        onChange={(e) =>
          setEndTime(e.target.value)
        }

        style={{
          padding: "10px",
          fontSize: "17px"
        }}

      />


      {/* Days */}

      <p>
        <b>Repeat Days</b>
      </p>


      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "7px"
        }}
      >

        {DAYS.map(([value, label]) => (

          <button

            key={value}

            onClick={() =>
              toggleDay(value)
            }

            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #aaa",

              background:
                selectedDays.includes(value)
                  ? "#1976d2"
                  : "#eee",

              color:
                selectedDays.includes(value)
                  ? "white"
                  : "black"
            }}

          >

            {label}

          </button>

        ))}

      </div>


      <br />


      {/* Save / Update */}

      {editingId ? (

        <>

          <button

            disabled={loading}

            onClick={updateCurrentSchedule}

            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#1976d2",
              color: "white",
              marginRight: "10px"
            }}

          >

            {loading
              ? "Updating..."
              : "✏️ Update Schedule"}

          </button>


          <button

            onClick={() => {

              resetForm();

              setMessage("");

            }}

            style={{
              padding: "12px 20px",
              borderRadius: "8px"
            }}

          >

            Cancel

          </button>

        </>

      ) : (

        <button

          disabled={loading}

          onClick={createSchedule}

          style={{
            padding: "12px 25px",
            borderRadius: "8px",
            border: "none",
            background:
              command === "ON"
                ? "#2e7d32"
                : "#d32f2f",
            color: "white",
            fontSize: "16px"
          }}

        >

          {loading
            ? "Saving..."
            : "💾 Save Schedule"}

        </button>

      )}


      <p
        style={{
          fontWeight: "bold"
        }}
      >

        {message}

      </p>


      <hr />


      {/* Saved Schedules */}

      <h3>📋 Saved Schedules</h3>


      {schedules.length === 0 ? (

        <p>No Schedule Found</p>

      ) : (

        schedules.map((item) => (

          <div

            key={item.$id}

            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "12px"
            }}

          >

            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold"
              }}
            >

              {item.command === "OFF"
                ? "🔴 OFF"
                : "🟢 ON"}

              {"  "}

              {item.startTime}

              {item.endTime !== item.startTime
                ? ` → ${item.endTime}`
                : ""}

            </div>


            <p>

              📅{" "}

              {item.days || "No days"}

            </p>


            <p>

              Status:{" "}

              {item.enabled
                ? "🟢 Enabled"
                : "⏸️ Disabled"}

            </p>


            {item.scheduledDate && (

              <p>

                📆 Date: {item.scheduledDate}

              </p>

            )}


            <button

              onClick={() =>
                toggleSchedule(item)
              }

              style={{
                marginRight: "8px",
                padding: "8px 12px"
              }}

            >

              {item.enabled
                ? "⏸️ Disable"
                : "▶️ Enable"}

            </button>


            <button

              onClick={() =>
                editSchedule(item)
              }

              style={{
                marginRight: "8px",
                padding: "8px 12px"
              }}

            >

              ✏️ Edit

            </button>


            <button

              onClick={() =>
                removeSchedule(item.$id)
              }

              style={{
                padding: "8px 12px"
              }}

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
