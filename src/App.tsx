import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm } from "./renderer/alarmSound";

export default function App() {
  const [customTime, setCustomTime] = useState("04:00");
  const [alarmTime, setAlarmTime] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [isRealAlarm, setIsRealAlarm] = useState(false);

  const timersRef = useRef<{ allow?: number }>({});

  const clearTimers = () => {
    if (timersRef.current.allow) {
      clearTimeout(timersRef.current.allow);
    }

    timersRef.current = {};
  };

  const closeApp = () => {
    if (isRinging && isRealAlarm && !canClose) {
      alert("Aguarde 6 segundos antes de fechar o despertador.");
      return;
    }

    stopLoudAlarm();
    clearTimers();

    if (window.electronAPI?.forceCloseAll) {
      window.electronAPI.forceCloseAll();
      return;
    }

    window.close();
  };

  const stopAlarm = () => {
    if (isRealAlarm && !canClose) {
      return;
    }

    stopLoudAlarm();
    clearTimers();

    setIsRinging(false);
    setCanClose(false);
    setIsRealAlarm(false);

    window.electronAPI?.setAlarmStatus(false);
  };

  const triggerAlarm = useCallback((realAlarm = true) => {
    setIsRinging(true);
    setIsRealAlarm(realAlarm);
    setCanClose(!realAlarm);

    startLoudAlarm();

    window.electronAPI?.setAlarmStatus(true);

    clearTimers();

    if (realAlarm) {
      timersRef.current.allow = window.setTimeout(() => {
        setCanClose(true);
      }, 6000);
    }
  }, []);

  const testAlarm = () => {
    triggerAlarm(false);
  };

  const confirmAlarm = () => {
    if (!customTime) return;

    setAlarmTime(customTime);

    window.electronAPI?.setAlarmTime(customTime);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!alarmTime || isRinging) return;

      const now = new Date();

      const currentTime =
        `${String(now.getHours()).padStart(2, "0")}:` +
        `${String(now.getMinutes()).padStart(2, "0")}`;

      if (currentTime === alarmTime) {
        triggerAlarm(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmTime, isRinging, triggerAlarm]);

  useEffect(() => {
    window.electronAPI?.getAlarmTime?.().then((time) => {
      if (time) {
        setAlarmTime(time);
      }
    });

    return () => {
      stopLoudAlarm();
      clearTimers();
    };
  }, []);

  const shouldShowCloseButton =
    (!alarmTime && !isRinging) ||
    (isRinging && (!isRealAlarm || canClose));

  return (
    <div className="alarm-wrapper">
      {shouldShowCloseButton && (
        <button className="close-button" onClick={closeApp}>
          ❌
        </button>
      )}

      {!alarmTime && !isRinging && (
        <div className="picker-overlay">
          <div className="picker-container">
            <input
              type="time"
              className="picker-input"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />

            <button className="confirm-btn" onClick={confirmAlarm}>
              Confirmar Alarme
            </button>

            <button className="confirm-btn" onClick={testAlarm}>
              Testar Som
            </button>
          </div>
        </div>
      )}

      {alarmTime && !isRinging && (
        <>
          <div className="top-clock">
            Alarme definido: {alarmTime}
            <span className="clock-icon">⏰</span>
          </div>

          <button className="confirm-btn" onClick={testAlarm}>
            Testar Som
          </button>
        </>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="alarm-time">TOCANDO</div>

          <div className="alarm-label">
            {isRealAlarm ? "Alarme Tocando Agora" : "Teste de Som"}
          </div>

          {canClose || !isRealAlarm ? (
            <>
              <button className="stop" onClick={stopAlarm}>
                Parar Alarme
              </button>

              <button className="confirm-btn" onClick={closeApp}>
                Fechar Despertador
              </button>
            </>
          ) : (
            <p className="waiting">
              Aguarde 6 segundos para parar ou fechar
            </p>
          )}
        </div>
      )}
    </div>
  );
}