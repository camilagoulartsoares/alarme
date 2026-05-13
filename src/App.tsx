import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm } from "./renderer/alarmSound";
export default function App() {
  const [customTime, setCustomTime] = useState("04:00");
  const [alarmTime, setAlarmTime] = useState("");
  const [nextFixedAlarm, setNextFixedAlarm] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [isRealAlarm, setIsRealAlarm] = useState(false);

  const FIXED_HOURS = [4, 5, 6];

  const timersRef = useRef<{
    allow?: number;
  }>({});

  const clearTimers = () => {
    if (timersRef.current.allow) {
      clearTimeout(timersRef.current.allow);
    }

    timersRef.current = {};
  };

  const stopSoundOnly = () => {
    stopLoudAlarm();
  };

  const stopAlarm = () => {
    if (isRealAlarm && !canStop) {
      return;
    }

    stopSoundOnly();
    clearTimers();

    setIsRinging(false);
    setCanStop(false);
    setIsRealAlarm(false);

    window.electronAPI?.setAlarmStatus(false);
  };

  const closeApp = () => {
    if (isRinging && isRealAlarm && !canStop) {
      alert("Você só poderá fechar depois de 20 segundos de alarme.");
      return;
    }

    stopSoundOnly();
    clearTimers();

    window.electronAPI?.forceCloseAll();
  };

  const triggerAlarm = useCallback((realAlarm = true) => {
    setIsRinging(true);
    setIsRealAlarm(realAlarm);
    setCanStop(!realAlarm);

    window.electronAPI?.setAlarmStatus(true);

    clearTimers();

    startLoudAlarm();

    if (realAlarm) {
      const TWENTY_SECONDS = 20 * 1000;

      timersRef.current.allow = window.setTimeout(() => {
        setCanStop(true);
      }, TWENTY_SECONDS);
    }
  }, []);

  const testAlarm = () => {
    triggerAlarm(false);
  };

  useEffect(() => {
    const updateNextFixedAlarm = () => {
      const now = new Date();

      for (const hour of FIXED_HOURS) {
        if (
          now.getHours() < hour ||
          (now.getHours() === hour && now.getMinutes() < 1)
        ) {
          setNextFixedAlarm(`${String(hour).padStart(2, "0")}:00`);
          return;
        }
      }

      setNextFixedAlarm(`${String(FIXED_HOURS[0]).padStart(2, "0")}:00`);
    };

    const interval = setInterval(() => {
      const now = new Date();

      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      if (currentTime === alarmTime && !isRinging) {
        triggerAlarm(true);
      }

      if (
        FIXED_HOURS.includes(now.getHours()) &&
        now.getMinutes() === 0 &&
        now.getSeconds() === 0 &&
        !isRinging
      ) {
        triggerAlarm(true);
      }

      updateNextFixedAlarm();
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmTime, isRinging, triggerAlarm]);

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (!isRinging || !isRealAlarm || canStop) return;

      const isExitKey =
        (e.key === "F4" && e.altKey) ||
        (e.ctrlKey && e.key.toLowerCase() === "w") ||
        (e.ctrlKey && e.key.toLowerCase() === "q") ||
        e.key === "Escape";

      if (isExitKey) {
        e.preventDefault();
        e.stopPropagation();

        alert("Aguarde 20 segundos antes de fechar ou parar o alarme.");
      }
    };

    window.addEventListener("keydown", blockKeys);

    return () => window.removeEventListener("keydown", blockKeys);
  }, [isRinging, isRealAlarm, canStop]);

  useEffect(() => {
    window.electronAPI?.getAlarmTime()?.then((time) => {
      if (time) setAlarmTime(time);
    });

    window.electronAPI?.onSyncAlarmTime?.((time: string) => {
      setAlarmTime(time);
    });

    window.electronAPI?.onSyncAlarmStatus?.((status: boolean) => {
      setIsRinging(status);

      if (!status) {
        setCanStop(false);
        setIsRealAlarm(false);
      }
    });

    return () => {
      clearTimers();
      stopSoundOnly();
    };
  }, []);

  return (
    <div className="alarm-wrapper">
      {!alarmTime && !isRinging && (
        <button className="close-button" onClick={closeApp}>
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
                if (!customTime) return;

                setAlarmTime(customTime);

                window.electronAPI?.setAlarmTime(customTime);
              }}
            >
              Confirmar
            </button>

            <button className="confirm-btn" onClick={testAlarm}>
              Testar Som
            </button>
          </div>
        </div>
      )}

      {alarmTime && !isRinging && (
        <button className="confirm-btn" onClick={testAlarm}>
          Testar Som
        </button>
      )}

      {isRinging && (
        <div className="alarm-card">
          <div className="alarm-time">TOCANDO</div>

          <div className="alarm-label">
            {isRealAlarm ? "Alarme Tocando Agora" : "Teste de Som"}
          </div>

          {canStop || !isRealAlarm ? (
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
              Espere 20 segundos para parar ou fechar o alarme
            </p>
          )}
        </div>
      )}
    </div>
  );
}