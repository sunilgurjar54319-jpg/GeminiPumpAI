import { useEffect, useState } from "react";
import {
  getHistory,
  clearHistory
} from "../api";

function HistoryCard() {

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {

    try {

      const data = await getHistory("PUMP001");

      if (Array.isArray(data)) {
        setHistory(data);
      }

    } catch (err) {

      console.log("History Error:", err);

    }

  }


  async function deleteHistory() {

    const ok = window.confirm(
      "क्या आप पूरी Pump History delete करना चाहते हैं?"
    );

    if (!ok) return;

    try {

      setLoading(true);

      const result =
        await clearHistory("PUMP001");

      if (result.success !== false) {
        setHistory([]);
      }

    } catch (err) {

      console.log("Clear History Error:", err);

    } finally {

      setLoading(false);

    }

  }


  function formatDate(date) {

    if (!date) return "Unknown";

    try {

      return new Date(date).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }
      );

    } catch {

      return date;

    }

  }


  useEffect(() => {

    loadHistory();

    const timer =
      setInterval(loadHistory, 5000);

    return () => clearInterval(timer);

  }, []);


  return (

    <div
      style={{
        padding: "20px"
      }}
    >

      {/* Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >

        <h2>
          📜 Pump History
        </h2>


        <button
          onClick={deleteHistory}
          disabled={
            loading ||
            history.length === 0
          }
          style={{
            background:
              history.length === 0
                ? "#ccc"
                : "#d32f2f",

            color: "white",

            border: "none",

            borderRadius: "20px",

            padding: "10px 18px",

            fontSize: "15px",

            cursor:
              history.length === 0
                ? "not-allowed"
                : "pointer"
          }}
        >

          {loading
            ? "⏳ Clearing..."
            : "🗑 Clear History"}

        </button>

      </div>


      <p
        style={{
          color: "#666",
          marginTop: "5px"
        }}
      >

        Latest pump ON/OFF activity

      </p>


      <hr />


      {/* Empty */}

      {history.length === 0 ? (

        <div
          style={{
            textAlign: "center",
            padding: "30px",
            color: "#777"
          }}
        >

          <div
            style={{
              fontSize: "45px"
            }}
          >
            📭
          </div>

          <p>
            No Pump History Found
          </p>

        </div>

      ) : (

        <div>

          {history.map(
            (item, index) => {

              const isOn =
                item.command === "ON";


              return (

                <div
                  key={
                    item.$id ||
                    `${item.createdAt}-${index}`
                  }
                  style={{
                    display: "flex",

                    alignItems: "center",

                    gap: "15px",

                    padding: "14px 10px",

                    marginBottom: "8px",

                    borderRadius: "10px",

                    background:
                      isOn
                        ? "#f1f8f3"
                        : "#fff3f3",

                    border:
                      "1px solid " +
                      (
                        isOn
                          ? "#c8e6c9"
                          : "#ffcdd2"
                      )
                  }}
                >

                  {/* Status Icon */}

                  <div
                    style={{
                      fontSize: "30px",
                      minWidth: "40px",
                      textAlign: "center"
                    }}
                  >

                    {isOn
                      ? "🟢"
                      : "🔴"}

                  </div>


                  {/* Details */}

                  <div
                    style={{
                      flex: 1
                    }}
                  >

                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold"
                      }}
                    >

                      {isOn
                        ? "Pump ON"
                        : "Pump OFF"}

                    </div>


                    <div
                      style={{
                        color: "#666",
                        fontSize: "14px",
                        marginTop: "4px"
                      }}
                    >

                      {formatDate(
                        item.createdAt
                      )}

                    </div>

                  </div>


                  {/* Result */}

                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#2e7d32"
                    }}
                  >

                    {item.result === "Completed"
                      ? "✓ Completed"
                      : item.result || "—"}

                  </div>

                </div>

              );

            }
          )}

        </div>

      )}

    </div>

  );

}


export default HistoryCard;
