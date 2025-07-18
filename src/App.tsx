import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

export default function App() {
  const [isRinging, setIsRinging] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [nextAlarm, setNextAlarm] = useState("");

  const audioRef1 = useRef(new Audio("/assets/alarm.wav"));
  const audioRef2 = useRef(new Audio("/assets/alarm.wav"));

  const ALARM_HOURS = [4, 5, 6];

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanStop(false);

    window.electronAPI?.setAlarmStatus(true);

    [audioRef1.current, audioRef2.current].forEach(audio => {
      audio.loop = true;
      audio.volume = 1;
      audio.play().catch(() => {});
    });

    setTimeout(() => {
      setCanStop(true);
    }, 5 * 60 * 1000);
  }, []);

  const stopAlarm = () => {
    [audioRef1.current, audioRef2.current].forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsRinging(false);
    window.electronAPI?.setAlarmStatus(false);
  };

  const getNextAlarmLabel = () => {
    const now = new Date();
    const next = new Date();

    for (const hour of ALARM_HOURS) {
      if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < 1)) {
        next.setHours(hour);
        next.setMinutes(0);
        return `${String(hour).padStart(2, "0")}:00`;
      }
    }

    next.setDate(next.getDate() + 1);
    next.setHours(ALARM_HOURS[0]);
    next.setMinutes(0);
    return `${String(ALARM_HOURS[0]).padStart(2, "0")}:00`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (
        ALARM_HOURS.includes(now.getHours()) &&
        now.getMinutes() === 0 &&
        now.getSeconds() === 0 &&
        !isRinging
      ) {
        triggerAlarm();
      }
    }, 1000);

    setNextAlarmLabel();
    return () => clearInterval(timer);
  }, [triggerAlarm, isRinging]);

  const setNextAlarmLabel = () => {
    const label = getNextAlarmLabel();
    setNextAlarm(label);
  };

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (!isRinging) return;

      const forbidden = ["F1", "F2", "F3", "F5"];
      const isExitKey =
        (e.key === "F4" && e.altKey) ||
        (e.ctrlKey && e.key.toLowerCase() === "c") ||
        forbidden.includes(e.key);

      if (isExitKey) {
        e.preventDefault();
        e.stopPropagation();
        alert("Você não pode sair ou baixar o volume durante o alarme.");
      }
    };

    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, [isRinging]);

  return (
    <div className="alarm-wrapper">
      <div className="top-clock">
        Próximo Alarme: {nextAlarm}
        <span className="clock-icon">⏰</span>
      </div>

      {isRinging && (
        <div className="alarm-card">
          <div className="alarm-time">TOCANDO</div>
          <div className="alarm-label">Alarme Automático</div>

          {canStop ? (
            <button className="stop" onClick={stopAlarm}>
              Parar Alarme
            </button>
          ) : (
            <p className="waiting">Espere 5 minutos para parar o alarme</p>
          )}
        </div>
      )}
    </div>
  );
}
