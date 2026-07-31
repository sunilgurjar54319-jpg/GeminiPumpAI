import { useEffect, useState } from "react";
import {
  getHistory,
  clearHistory
} from "../api";

function HistoryCard() {

  const [history, setHistory] = useState([]);

  async function loadHistory() {

    try {

      const data = await getHistory("PUMP001");

      setHistory(data);

    } catch (err) {

      console.log(err);

    }

  }

  async function deleteHistory() {

    const ok = confirm("Clear complete history?");

    if (!ok) return;

    await clearHistory("PUMP001");

    loadHistory();

  }

  useEffect(() => {

    loadHistory();

    const timer = setInterval(loadHistory, 5000);

    return () => clearInterval(timer);

  }, []);

  return (

    <div
      style={{
        border:"1px solid #ddd",
        borderRadius:"10px",
        padding:"15px",
        marginTop:"20px"
      }}
    >

      <h2>📜 Pump History</h2>

      <button onClick={deleteHistory}>
        🗑 Clear History
      </button>

      <br/><br/>

      {

        history.length===0 ?

        <p>No History</p>

        :

        history.map(item=>(

          <div
            key={item.$id}
            style={{
              borderBottom:"1px solid #eee",
              padding:"8px"
            }}
          >

            <b>

              {item.command==="ON" ? "🟢 ON" : "🔴 OFF"}

            </b>

            <br/>

            {item.createdAt}

          </div>

        ))

      }

    </div>

  );

}

export default HistoryCard;
