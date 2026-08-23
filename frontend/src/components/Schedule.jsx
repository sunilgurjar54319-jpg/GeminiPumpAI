import { useEffect, useState } from "react";
import {
  saveSchedule,
  getSchedules,
  deleteSchedule,
  updateSchedule
} from "../api";
import Icon from "./Icon";

const DAYS = [
  ["Mon", "Mon"],
  ["Tue", "Tue"],
  ["Wed", "Wed"],
  ["Thu", "Thu"],
  ["Fri", "Fri"],
  ["Sat", "Sat"],
  ["Sun", "Sun"]
];

function Schedule({ refresh, deviceName, selectedDeviceId }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

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

      const data = await getSchedules(selectedDeviceId);

      if (data.success) {
        setSchedules(data.schedules);
      }

    } catch (err) {

      console.log(err);
      setMessage(" Schedule Load Failed");

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

      setMessage(" Start और End time चुनें");

      return;

    }

    if (selectedDays.length === 0) {

      setMessage(" कम से कम एक दिन चुनें");

      return;

    }

    setLoading(true);

    try {

      const result = await saveSchedule({

        deviceId: selectedDeviceId,

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
            ? " ON Schedule Saved"
            : " OFF Schedule Saved"
        );

        resetForm();

        await loadSchedules();

      } else {

        setMessage(
          " " + (result.error || "Schedule Save Failed")
        );

      }

    } catch (err) {

      console.log(err);

      setMessage(" Server Error");

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

      setMessage(" Delete Failed");

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

    setMessage(" Editing Schedule");

  }


  // =========================
  // Update
  // =========================

  async function updateCurrentSchedule() {

    if (!editingId) return;

    if (!startTime || !endTime) {

      setMessage(" Start और End time चुनें");

      return;

    }

    if (selectedDays.length === 0) {

      setMessage(" कम से कम एक दिन चुनें");

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

        setMessage(" Schedule Updated");

        resetForm();

        await loadSchedules();

      } else {

        setMessage(
          " " + (result.error || "Update Failed")
        );

      }

    } catch (err) {

      console.log(err);

      setMessage(" Server Error");

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

        setMessage("");
        await loadSchedules();

      }

    } catch (err) {

      console.log(err);

      setMessage(" Status Update Failed");

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

    // Device बदलते ही पुराने device की schedules हटाएँ
    setSchedules([]);
    setEditingId(null);
    setMessage("");

    loadSchedules();

  }, [refresh, selectedDeviceId]);


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

      <button
        type="button"
        className="accordion-header schedule-accordion-header"
        onClick={() => setScheduleOpen(v => !v)}
        aria-expanded={scheduleOpen}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="clock" size={20} />
          Schedule
        </span>

        <span
          className={`accordion-chevron ${
            scheduleOpen ? "is-open" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        className={`accordion-content schedule-accordion-content ${
          scheduleOpen ? "accordion-content-open" : "accordion-content-closed"
        }`}
      ><div className="accordion-slide-content schedule-slide-content">



      {/* Command */}

      <p>
        <b>Command</b>
      </p>

      <button
        type="button"
        className={`schedule-command-pill ${
          command === "ON" ? "schedule-command-active-on" : ""
        }`}
        onClick={() => setCommand("ON")}
      >
        ON
      </button>


      <button
        type="button"
        className={`schedule-command-pill ${
          command === "OFF" ? "schedule-command-active-off" : ""
        }`}
        onClick={() => setCommand("OFF")}
      >
        OFF
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

            type="button"
            className={`schedule-day-pill ${selectedDays.includes(value) ? "schedule-day-selected" : ""}`}
            onClick={() => toggleDay(value)}

            className={`schedule-day-button ${
              selectedDays.includes(value)
                ? "schedule-day-selected"
                : "schedule-day-ghost"
            }`}

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
              : " Update Schedule"}

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

          {loading ? (
            "Saving..."
          ) : (
            <>
              <Icon name="save" size={18} />
              <span>Save Schedule</span>
            </>
          )}

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

      <h3> Saved Schedules</h3>

      {schedules.length === 0 ? (

        <p>📭 अभी कोई Schedule सेव नहीं है</p>

      ) : (

        schedules.map((item, index) => {

          const commandText =
            String(item.command || "").toUpperCase() === "OFF"
              ? "OFF"
              : "ON";

          const timeText =
            item.endTime &&
            item.endTime !== item.startTime
              ? `${item.startTime} → ${item.endTime}`
              : item.startTime;

          const dayText =
            item.days === "Sun,Mon,Tue,Wed,Thu,Fri,Sat"
              ? "हर दिन"
              : (item.days || "दिन निर्धारित नहीं");

          return (
            <div
              key={item.$id}
              className="saved-schedule-card"
            >
              <div className="saved-schedule-top">

                <div className="saved-schedule-main">
                  <div className={`saved-schedule-action ${
                    String(commandText).toUpperCase().includes("OFF")
                      ? "is-off"
                      : "is-on"
                  }`}>
                    <span className="saved-schedule-status-dot" />
                    {commandText}
                  </div>

                  <div className="saved-schedule-time">
                    {timeText}
                  </div>

                  <div className="saved-schedule-days">
                    {item.scheduledDate
                      ? `Only Once: ${item.scheduledDate}`
                      : `Repeats: ${dayText}`}
                  </div>
                </div>

                <button
                  type="button"
                  className={`saved-schedule-toggle ${
                    item.enabled ? "is-on" : "is-off"
                  }`}
                  onClick={() => toggleSchedule(item)}
                  aria-label={
                    item.enabled
                      ? "Disable schedule"
                      : "Enable schedule"
                  }
                  title={
                    item.enabled
                      ? "Disable schedule"
                      : "Enable schedule"
                  }
                >
                  <span className="saved-schedule-toggle-knob" />
                </button>

              </div>

              <div className="saved-schedule-actions">

                <button
                  type="button"
                  className="saved-schedule-icon-button"
                  onClick={() => editSchedule(item)}
                  aria-label="Edit schedule"
                  title="Edit schedule"
                >
                  <Icon name="edit" size={17} />
                </button>

                <button
                  type="button"
                  className="saved-schedule-icon-button delete"
                  onClick={() => {
                    if (
                      window.confirm(
                        `क्या Schedule #${index + 1} को Delete करना है?`
                      )
                    ) {
                      removeSchedule(item.$id);
                    }
                  }}
                  aria-label="Delete schedule"
                  title="Delete schedule"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>

              </div>
            </div>

          );
        })

      )}

        </div>
      </div>
    </div>

  );

}

export default Schedule;
