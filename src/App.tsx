import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm } from "./renderer/alarmSound";

export default function App() {
  const FIXED_ALARM_TIME = "04:00";
  const UNLOCK_DELAY_MS = 10000;

  const [alarmTime, setAlarmTime] = useState(FIXED_ALARM_TIME);
  const [isRinging, setIsRinging] = useState(false);
  const [canClose, setCanClose] = useState(false);

  const timerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const closeApp = () => {
    if (alarmTime && !canClose) return;

    stopLoudAlarm();
    clearCloseTimer();

    window.electronAPI?.setAlarmStatus(false);
    window.electronAPI?.forceCloseAll?.();
  };

  const stopAlarm = () => {
    if (!canClose) return;

    stopLoudAlarm();
    clearCloseTimer();

    setIsRinging(false);
    setCanClose(false);
    setAlarmTime(FIXED_ALARM_TIME);

    window.electronAPI?.setAlarmStatus(true);
    window.electronAPI?.setAlarmTime(FIXED_ALARM_TIME);
  };

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanClose(false);

    window.electronAPI?.setAlarmStatus(true);

    startLoudAlarm();

    clearCloseTimer();

    timerRef.current = window.setTimeout(() => {
      setCanClose(true);
      window.electronAPI?.setAlarmStatus(false);
    }, UNLOCK_DELAY_MS);
  }, []);

  useEffect(() => {
    setAlarmTime(FIXED_ALARM_TIME);

    window.electronAPI?.setAlarmTime(FIXED_ALARM_TIME);
    window.electronAPI?.setAlarmStatus(true);

    const interval = setInterval(() => {
      if (!alarmTime || isRinging) return;

      const now = new Date();

      const currentTime =
        `${String(now.getHours()).padStart(2, "0")}:` +
        `${String(now.getMinutes()).padStart(2, "0")}`;

      if (currentTime === alarmTime) {
        triggerAlarm();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmTime, isRinging, triggerAlarm]);

  useEffect(() => {
    return () => {
      stopLoudAlarm();
      clearCloseTimer();
    };
  }, []);

  const showCloseButton = canClose;

  return (
    <div className={`alarm-wrapper ${isRinging ? "ringing-mode" : ""}`}>
      {showCloseButton && (
        <button className="close-button" onClick={closeApp}>
          ×
        </button>
      )}

      {!isRinging && (
        <div className="picker-overlay">
          <div className="picker-container active-alarm">
            <div className="alarm-icon active">⏰</div>

            <span className="small-title">Despertador</span>

            <h1>Alarme diário definido</h1>

            <div className="top-clock">{alarmTime} ⏰</div>

            <p className="description">
              O despertador tocará automaticamente todos os dias às 04:00.
            </p>
          </div>
        </div>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="ring-badge">🔔</div>

          <div className="alarm-time">TOCANDO</div>

          {!canClose ? (
            <p className="waiting">Aguarde 10 segundos para parar ou fechar.</p>
          ) : (
            <div className="alarm-buttons">
              <button className="stop" onClick={stopAlarm}>
                Parar Alarme
              </button>

              <button className="close-app" onClick={closeApp}>
                Fechar Despertador
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}