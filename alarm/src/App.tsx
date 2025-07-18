import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [alarmTime, setAlarmTime] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const audioRef = useRef(new Audio("/assets/alarm.wav"));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerAlarm = useCallback(() => {
    const audio = audioRef.current;
    setIsRinging(true);
    audio.loop = true;
    audio.volume = 0;
    audio.play();
    fadeInVolume(audio);
    setCanStop(false);
    setTimeout(() => setCanStop(true), 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRinging) {
        e.preventDefault();
        e.returnValue = "O alarme está tocando. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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

  const fadeInVolume = (audio: HTMLAudioElement) => {
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (audio.volume < 1) {
        audio.volume = Math.min(1, audio.volume + 0.01);
      } else {
        clearInterval(interval);
      }
    }, 300);
  };

  const stopAlarm = () => {
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setIsRinging(false);
    setShowTimePicker(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
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

  return (
    <div className="alarm-wrapper">
      <div className="top-clock" onClick={() => {
        setTempTime(alarmTime || "");
        setShowTimePicker(true);
      }}>
        {alarmTime || "--:--"}
        <span className="clock-icon">🕒</span>
      </div>

      {showTimePicker && (
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
                setShowTimePicker(false);
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