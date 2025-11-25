import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import { AuthContext } from "@/context/AuthContext";

export default function SessionPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // QR state
  const [qrImage, setQrImage] = useState(null);
  const [qrExpiry, setQrExpiry] = useState(null);
  const [qrRemaining, setQrRemaining] = useState(null);

  // Session state
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [sessionRemaining, setSessionRemaining] = useState(null);

  // Live attendance
  const [presentStudents, setPresentStudents] = useState([]);

  // Ended?
  const [sessionEnded, setSessionEnded] = useState(false);

  // Extend
  const [extendMinutes, setExtendMinutes] = useState(5);
  const [extending, setExtending] = useState(false);

  // Notification
  const [note, setNote] = useState("");

  // timers
  const qrInterval = useRef(null);
  const sesInterval = useRef(null);
  const liveInterval = useRef(null);

  /* -------------------------------------------------------
     HELPERS
  -------------------------------------------------------- */
  const clearAllIntervals = () => {
    clearInterval(qrInterval.current);
    clearInterval(sesInterval.current);
    clearInterval(liveInterval.current);
  };

  const notify = (msg) => {
    setNote(msg);
    setTimeout(() => setNote(""), 2000);
  };

  /* -------------------------------------------------------
     FETCH QR
  -------------------------------------------------------- */
  const fetchQr = async () => {
    try {
      const res = await api.get(`/teacher/sessions/${sessionId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQrImage(res.data.qrImage);
      setQrExpiry(new Date(res.data.validTo).getTime());
    } catch (err) {
      console.error("QR ERROR:", err);
    }
  };

  /* -------------------------------------------------------
     FETCH LIVE
  -------------------------------------------------------- */
  const fetchLive = async () => {
    try {
      const res = await api.get(`/teacher/sessions/${sessionId}/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPresentStudents(res.data.presentStudents || []);
    } catch (err) {
      console.error("LIVE ERROR:", err);
    }
  };

  /* -------------------------------------------------------
     START TIMERS
  -------------------------------------------------------- */
  const startTimers = () => {
    clearAllIntervals();

    // QR Timer
    qrInterval.current = setInterval(() => {
      if (!qrExpiry) return;
      const left = Math.max(Math.floor((qrExpiry - Date.now()) / 1000), 0);
      setQrRemaining(left);
      if (left <= 0) fetchQr();
    }, 1000);

    // SESSION TIMER
    sesInterval.current = setInterval(() => {
      if (!sessionEndTime) return;
      const left = Math.max(
        Math.floor((sessionEndTime - Date.now()) / 1000),
        0
      );
      setSessionRemaining(left);

      if (left <= 0) {
        setSessionEnded(true);
        clearAllIntervals();
      }
    }, 1000);

    // LIVE attendance timer
    liveInterval.current = setInterval(fetchLive, 5000);

    // **Fix:** fetch live instantly (no 5s delay)
    fetchLive();
  };

  /* -------------------------------------------------------
     EXTEND SESSION
  -------------------------------------------------------- */
  const extendSession = async () => {
    try {
      setExtending(true);

      const res = await api.post(
        `/teacher/sessions/${sessionId}/extend`,
        { extraMinutes: extendMinutes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newEnd = new Date(res.data.newEnd).getTime();
      setSessionEndTime(newEnd);

      setSessionEnded(false);

      // Restart timers from absolute zero
      startTimers();

      // Fetch QR immediately for fresh session
      fetchQr();

      notify("Session extended");
    } catch (err) {
      console.error("EXTEND ERROR:", err);
    }
    setExtending(false);
  };

  /* -------------------------------------------------------
     END SESSION NOW
  -------------------------------------------------------- */
  const endSessionNow = async () => {
    try {
      await api.post(
        `/teacher/sessions/${sessionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessionEnded(true);
      clearAllIntervals();
    } catch (err) {
      console.error("END ERROR:", err);
    }
  };

  /* -------------------------------------------------------
     INITIAL LOAD
  -------------------------------------------------------- */
  useEffect(() => {
    fetchQr();
    fetchLive();

    const st = location.state?.session;
    if (st?.endTime) setSessionEndTime(new Date(st.endTime).getTime());
  }, []);

  useEffect(() => {
    if (sessionEndTime && qrExpiry) startTimers();
  }, [sessionEndTime, qrExpiry]);

  const format = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* -------------------------------------------------------
     UI
  -------------------------------------------------------- */
  return (
    <div className="min-h-screen p-10 bg-gray-300 flex gap-6">
      {/* Notification */}
      {note && (
        <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded shadow z-50">
          {note}
        </div>
      )}

      {/* LEFT – LIVE ATTENDANCE */}
      <div className="w-1/3">
        <div className="bg-white p-4 shadow-xl rounded-xl h-full overflow-y-auto">
          <h2 className="text-xl font-semibold mb-3">Live Attendance</h2>

          {presentStudents.length === 0 ? (
            <p className="text-gray-500">No students yet...</p>
          ) : (
            <ul className="space-y-3">
              {presentStudents.map((stu) => (
                <li
                  key={stu.id}
                  className="p-3 bg-green-50 border border-green-300 rounded-lg shadow-sm"
                >
                  <p className="font-bold">{stu.MIS}</p>
                  <p className="text-sm">
                    {stu.firstName} {stu.lastName}
                  </p>
                  {stu.Class && (
                    <p className="text-xs text-gray-500">{stu.Class.name}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* CENTER — QR */}
      <div className="flex-1 flex flex-col items-center">
        {!sessionEnded && (
          <div className="bg-white p-6 shadow-xl rounded-xl">
            {qrImage ? (
              <img src={qrImage} className="w-[420px] h-[420px]" />
            ) : (
              <p>Loading QR...</p>
            )}
          </div>
        )}

        {sessionEnded && (
          <div className="mt-8 text-center">
            <p className="text-red-600 font-bold text-xl mb-4">Session Ended</p>

            <div className="flex gap-4 justify-center">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <p className="text-sm font-medium mb-2">Extend Session</p>

                <select
                  className="border p-2 rounded w-32"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(Number(e.target.value))}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>

                <button
                  onClick={extendSession}
                  disabled={extending}
                  className="mt-3 w-full bg-green-600 text-white py-2 rounded"
                >
                  {extending ? "Extending..." : "Extend"}
                </button>
              </div>

              <button
                onClick={() => navigate(`/session/${sessionId}/review`)}
                className="bg-blue-600 text-white px-8 py-3 rounded shadow hover:bg-blue-700"
              >
                Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — TIMERS */}
      <div className="w-1/4">
        <div className="bg-white p-4 shadow-xl rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Timers</h2>

          <p className="text-lg">
            <b>Session Ends In:</b>
            <br />
            <span className="text-red-600">
              {sessionRemaining != null ? format(sessionRemaining) : "..."}
            </span>
          </p>

          {!sessionEnded && (
            <button
              onClick={endSessionNow}
              className="mt-6 w-full bg-red-600 text-white py-3 rounded"
            >
              End Session Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
