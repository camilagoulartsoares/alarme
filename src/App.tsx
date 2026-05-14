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
    if (isRealAlarm && !canClose) return;

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
    <div className={`alarm-wrapper ${isRinging ? "ringing-mode" : ""}`}>
      <div className="bg-light bg-light-one" />
      <div className="bg-light bg-light-two" />

      {shouldShowCloseButton && (
        <button className="close-button" onClick={closeApp}>
          ×
        </button>
      )}

      {!alarmTime && !isRinging && (
        <div className="picker-overlay">
          <div className="picker-container">
            <div className="alarm-icon">⏰</div>

            <span className="small-title">Despertador</span>

            <h1>Defina seu alarme</h1>

            <p className="description">
              Escolha o horário e confirme para deixar o despertador ativo.
            </p>

            <input
              type="time"
              className="picker-input"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />

            <button className="confirm-btn" onClick={confirmAlarm}>
              Confirmar Alarme
            </button>

            <button className="secondary-btn" onClick={testAlarm}>
              Testar Som
            </button>
          </div>
        </div>
      )}

      {alarmTime && !isRinging && (
        <div className="picker-overlay">
          <div className="picker-container active-alarm">
            <div className="alarm-icon active">✓</div>

            <span className="small-title">Alarme ativo</span>

            <div className="top-clock">
              {alarmTime}
              <span className="clock-icon">⏰</span>
            </div>

            <p className="description">
              O despertador irá tocar no horário definido.
            </p>

            <button className="secondary-btn" onClick={testAlarm}>
              Testar Som
            </button>
          </div>
        </div>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="ring-badge">🔔</div>

          <div className="alarm-time">TOCANDO</div>

          <div className="alarm-label">
            {isRealAlarm ? "Alarme tocando agora" : "Teste de som"}
          </div>

          {canClose || !isRealAlarm ? (
            <div className="alarm-buttons">
              <button className="stop" onClick={stopAlarm}>
                Parar Alarme
              </button>

              <button className="close-app" onClick={closeApp}>
                Fechar Despertador
              </button>
            </div>
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