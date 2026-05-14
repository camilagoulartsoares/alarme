import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm } from "./renderer/alarmSound";

export default function App() {
  const [customTime, setCustomTime] = useState("04:00");
  const [alarmTime, setAlarmTime] = useState("");
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
    setAlarmTime("");

    window.electronAPI?.setAlarmStatus(false);
    window.electronAPI?.setAlarmTime("");
  };

  const triggerAlarm = useCallback(() => {
    setIsRinging(true);
    setCanClose(false);

    window.electronAPI?.setAlarmStatus(true);

    startLoudAlarm();

    clearCloseTimer();

    timerRef.current = window.setTimeout(() => {
      setCanClose(true);

      // libera fechar depois de 10 segundos
      window.electronAPI?.setAlarmStatus(false);
    }, 10000);
  }, []);

  const confirmAlarm = () => {
    if (!customTime) return;

    setAlarmTime(customTime);
    setCanClose(false);

    // bloqueia fechar imediatamente ao definir horário
    window.electronAPI?.setAlarmStatus(true);

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
        triggerAlarm();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmTime, isRinging, triggerAlarm]);

  useEffect(() => {
    window.electronAPI?.getAlarmTime?.().then((time) => {
      if (time) {
        setAlarmTime(time);

        // se já existe alarme salvo, mantém bloqueado
        window.electronAPI?.setAlarmStatus(true);
      }
    });

    return () => {
      stopLoudAlarm();
      clearCloseTimer();
    };
  }, []);

  // botão X só aparece:
  // - quando não há alarme definido
  // - OU depois dos 10 segundos
  const showCloseButton = !alarmTime || canClose;

  return (
    <div className={`alarm-wrapper ${isRinging ? "ringing-mode" : ""}`}>
      {showCloseButton && (
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
          </div>
        </div>
      )}

      {alarmTime && !isRinging && (
        <div className="picker-overlay">
          <div className="picker-container active-alarm">
            <div className="alarm-icon active">✓</div>

            <span className="small-title">Alarme ativo</span>

            <div className="top-clock">{alarmTime} ⏰</div>

            <p className="description">
              O botão de fechar ficará bloqueado até o alarme tocar por 10
              segundos.
            </p>
          </div>
        </div>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="ring-badge">🔔</div>

          <div className="alarm-time">TOCANDO</div>

          {!canClose ? (
            <p className="waiting">
              Aguarde 10 segundos para parar ou fechar.
            </p>
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