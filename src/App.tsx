import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

export default function App() {
  const [customTime, setCustomTime] = useState("");
  const [alarmTime, setAlarmTime] = useState("");
  const [nextFixedAlarm, setNextFixedAlarm] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [canStop, setCanStop] = useState(false);

  
  const FIXED_HOURS = [5, 6, 7];

  const alarmAudioRefs = useRef<HTMLAudioElement[]>([]);

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanStop(false);
    window.electronAPI?.setAlarmStatus(true);

    alarmAudioRefs.current = [];

    for (let i = 0; i < 3; i++) {
      const audio = new Audio("/assets/alarm.wav");
      audio.loop = true;
      audio.volume = 1;
      audio.play().catch(() => {});
      alarmAudioRefs.current.push(audio);
    }
  }, []);

  const stopAlarm = () => {
    alarmAudioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    alarmAudioRefs.current = [];
    setIsRinging(false);
    setCanStop(false);
    window.electronAPI?.setAlarmStatus(false);
  };

  useEffect(() => {
    const updateNextFixedAlarm = () => {
      const now = new Date();
      const next = new Date();

      for (const hour of FIXED_HOURS) {
        if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < 1)) {
          next.setHours(hour);
          next.setMinutes(0);
          setNextFixedAlarm(`${String(hour).padStart(2, "0")}:00`);
          return;
        }
      }

      next.setDate(next.getDate() + 1);
      next.setHours(FIXED_HOURS[0]);
      next.setMinutes(0);
      setNextFixedAlarm(`${String(FIXED_HOURS[0]).padStart(2, "0")}:00`);
    };

    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (currentTime === alarmTime && !isRinging) {
        triggerAlarm();
      }

      if (
        FIXED_HOURS.includes(now.getHours()) &&
        now.getMinutes() === 0 &&
        now.getSeconds() === 0 &&
        !isRinging
      ) {
        triggerAlarm();
      }

      updateNextFixedAlarm();
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmTime, isRinging, triggerAlarm]);

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
        alert("Você não pode sair ou abaixar o volume durante o alarme.");
      }
    };

    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, [isRinging]);

  useEffect(() => {
    window.electronAPI?.getAlarmTime()?.then((time) => {
      if (time) setAlarmTime(time);
    });

    window.electronAPI?.onSyncAlarmTime?.((time: string) => {
      setAlarmTime(time);
    });

    window.electronAPI?.onSyncAlarmStatus?.((status: boolean) => {
      setIsRinging(status);
      if (!status) setCanStop(false);
    });
  }, []);

  useEffect(() => {
    if (!isRinging) return;

    const timeout = setTimeout(() => {
      setCanStop(true);
    }, 1 * 60 * 1000); 

    return () => clearTimeout(timeout);
  }, [isRinging]);

  return (
    <div className="alarm-wrapper">
      {(!isRinging || canStop) && (
        <button className="close-button" onClick={() => window.electronAPI?.forceCloseAll()}>
          ❌
        </button>
      )}

      {alarmTime && (
        <div className="top-clock">
          Alarme Manual: {alarmTime}
          <span className="clock-icon">⏰</span>
        </div>
      )}

      <div className="top-clock">
        Próximo Alarme Fixo: {nextFixedAlarm}
        <span className="clock-icon">⏰</span>
      </div>

      {!alarmTime && (
        <div className="picker-overlay">
          <div className="picker-container">
            <input
              type="time"
              className="picker-input"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
            <button
              className="confirm-btn"
              onClick={() => {
                setAlarmTime(customTime);
                window.electronAPI?.setAlarmTime(customTime);
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="alarm-time">TOCANDO</div>
          <div className="alarm-label">Alarme Ativo</div>
          {canStop ? (
            <button className="stop" onClick={stopAlarm}>
              Parar Alarme
            </button>
          ) : (
            <p className="waiting">Espere 1 minuto para parar o alarme</p>
          )}
        </div>
      )}
    </div>
  );
}
