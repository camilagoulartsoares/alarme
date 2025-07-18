import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [alarmTime, setAlarmTime] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [canStop, setCanStop] = useState(false);

  const audioRef1 = useRef(new Audio("/assets/alarm.wav"));
  const audioRef2 = useRef(new Audio("/assets/alarm.wav"));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanStop(false);

    window.electronAPI?.setAlarmStatus(true);

    [audioRef1.current, audioRef2.current].forEach(audio => {
      audio.loop = true;
      audio.volume = 1;
      audio.play().catch(() => {});
    });

    setTimeout(() => setCanStop(true), 5 * 60 * 1000);
  }, []);

  const stopAlarm = () => {
    [audioRef1.current, audioRef2.current].forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsRinging(false);
    window.electronAPI?.setAlarmStatus(false);
  };

  const repeatAlarm = () => {
    stopAlarm();
    const [h, m] = alarmTime.split(":").map(Number);
    const next = new Date();
    next.setHours(h);
    next.setMinutes(m + 5);
    const formatted = `${String(next.getHours()).padStart(2, "0")}:${String(
      next.getMinutes()
    ).padStart(2, "0")}`;
    setAlarmTime(formatted);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRinging) {
        e.preventDefault();
        e.returnValue = "O alarme está tocando. Você não pode sair agora.";
        return "O alarme está tocando. Você não pode sair agora.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRinging]);

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (!isRinging) return;

      const isMac = navigator.platform.toUpperCase().includes("MAC");

      if (
        e.key === "F5" ||
        (e.key.toLowerCase() === "r" && (e.ctrlKey || (isMac && e.metaKey))) ||
        (e.key === "F5" && e.altKey) ||
        (e.key === "F4" && e.altKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert("Você não pode atualizar ou sair enquanto o alarme está tocando.");
      }
    };

    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, [isRinging]);

  useEffect(() => {
    if (alarmTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const current = now.toTimeString().slice(0, 5);
        if (current === alarmTime && !isRinging) {
          triggerAlarm();
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alarmTime, isRinging, triggerAlarm]);

  return (
    <div className="alarm-wrapper">
      {alarmTime && (
        <div className="top-clock">
          {alarmTime}
          <span className="clock-icon">⏰</span>
        </div>
      )}

      {!alarmTime && (
        <div className="picker-overlay">
          <div className="picker-container">
            <input
              type="time"
              className="picker-input"
              value={tempTime}
              onChange={(e) => setTempTime(e.target.value)}
            />
            <button
              className="confirm-btn"
              onClick={() => {
                setAlarmTime(tempTime);
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {alarmTime && (
        <div className="alarm-card">
          <div className="alarm-time">
            {alarmTime}
            <span className="am-pm">AM</span>
          </div>

          <div className="alarm-label">Hora do Alarme</div>

          {isRinging ? (
            canStop ? (
              <div className="alarm-buttons">
                <button className="stop" onClick={stopAlarm}>
                  Parar Alarme
                </button>
                <button className="repeat" onClick={repeatAlarm}>
                  Repetir Alarme
                </button>
              </div>
            ) : (
              <p className="waiting">Espere 5 minutos para parar o alarme</p>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
