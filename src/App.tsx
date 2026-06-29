import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm, unlockAudio } from "./renderer/alarmSound";

export default function App() {
  const DEFAULT_ALARM_TIME = "04:00";
  const UNLOCK_DELAY_MS = 10000;

  const [alarmTime, setAlarmTime] = useState(DEFAULT_ALARM_TIME);
  const [isRinging, setIsRinging] = useState(false);
  const [canClose, setCanClose] = useState(true);

  const timerRef = useRef<number | null>(null);
  const lastTriggeredRef = useRef<string | null>(null);

  const clearCloseTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const closeApp = () => {
    if (isRinging && !canClose) return;

    stopLoudAlarm();
    clearCloseTimer();

    window.electronAPI?.forceCloseAll();
  };

  const stopAlarm = () => {
    if (!canClose) return;

    stopLoudAlarm();
    clearCloseTimer();

    setIsRinging(false);
    setCanClose(true);
  };

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanClose(false);

    void startLoudAlarm();

    clearCloseTimer();

    timerRef.current = window.setTimeout(() => {
      setCanClose(true);
    }, UNLOCK_DELAY_MS);
  }, []);

  useEffect(() => {
    const unlockOnInteraction = () => {
      void unlockAudio();
    };

    window.addEventListener("pointerdown", unlockOnInteraction);
    window.addEventListener("keydown", unlockOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.setAlarmTime(alarmTime);
  }, [alarmTime]);

  useEffect(() => {
    window.electronAPI?.setAlarmStatus(isRinging && !canClose);
  }, [isRinging, canClose]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!alarmTime || isRinging) return;

      const now = new Date();

      const currentTime =
        `${String(now.getHours()).padStart(2, "0")}:` +
        `${String(now.getMinutes()).padStart(2, "0")}`;

      const currentDate = now.toDateString();
      const triggerKey = `${currentDate}-${currentTime}`;

      if (currentTime === alarmTime && lastTriggeredRef.current !== triggerKey) {
        lastTriggeredRef.current = triggerKey;
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

  return (
    <div className={`alarm-wrapper ${isRinging ? "ringing-mode" : ""}`}>
      <button type="button" className="close-button" onClick={closeApp}>
        ×
      </button>

      {!isRinging && (
        <div className="picker-overlay">
          <div className="picker-container active-alarm">
            <div className="alarm-icon active">⏰</div>

            <span className="small-title">Despertador</span>

            <h1>Alarme diário definido</h1>

            <div className="top-clock">{alarmTime} ⏰</div>

            <p className="description">
              Escolha um horário para testar ou deixe às 04:00.
            </p>

            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
            />

            <button type="button" onClick={triggerAlarm}>
              Testar alarme agora
            </button>

            <p className="description">
              O despertador tocará automaticamente todos os dias no horário escolhido.
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