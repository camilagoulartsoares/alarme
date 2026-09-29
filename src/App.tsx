import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { startLoudAlarm, stopLoudAlarm, unlockAudio } from "./renderer/alarmSound";

const DEFAULT_ALARM_TIME = "04:00";
const UNLOCK_DELAY_MS = 10000;
const isValidAlarmTime = (time: unknown): time is string => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

export default function App() {
  const [alarmTime, setAlarmTime] = useState("");
  const [alarmLoaded, setAlarmLoaded] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [canClose, setCanClose] = useState(true);
  const timerRef = useRef<number | null>(null);

  const clearCloseTimer = () => { if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; } };
  const showAlarm = useCallback(() => {
    setIsRinging(true); setCanClose(false); void startLoudAlarm(); clearCloseTimer();
    timerRef.current = window.setTimeout(() => setCanClose(true), UNLOCK_DELAY_MS);
  }, []);
  const stopAlarm = () => {
    if (!canClose) return;
    stopLoudAlarm(); clearCloseTimer(); setIsRinging(false); setCanClose(true); window.electronAPI.alarmStopped();
  };
  const closeApp = () => {
    if (isRinging && !canClose) return;
    stopLoudAlarm(); clearCloseTimer(); window.electronAPI.forceCloseAll();
  };

  useEffect(() => {
    let active = true;
    void window.electronAPI.getAlarmState().then((state) => {
      if (!active) return;
      setAlarmTime(isValidAlarmTime(state.alarmTime) ? state.alarmTime : DEFAULT_ALARM_TIME);
      if (state.status === "ringing") showAlarm();
      setAlarmLoaded(true);
    }).catch(() => { if (active) { setAlarmTime(DEFAULT_ALARM_TIME); setAlarmLoaded(true); } });
    return () => { active = false; };
  }, [showAlarm]);

  useEffect(() => window.electronAPI.onSyncAlarmTime((time) => { if (isValidAlarmTime(time)) setAlarmTime(time); }), []);
  useEffect(() => window.electronAPI.onAlarmTriggered(() => showAlarm()), [showAlarm]);
  useEffect(() => {
    const unlock = () => void unlockAudio();
    window.addEventListener("pointerdown", unlock); window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
  useEffect(() => () => { stopLoudAlarm(); clearCloseTimer(); }, []);

  if (!alarmLoaded) return <div className="alarm-wrapper"><div className="picker-overlay"><div className="picker-container active-alarm"><span className="small-title">Carregando despertador...</span></div></div></div>;
  return <div className={`alarm-wrapper ${isRinging ? "ringing-mode" : ""}`}>
    <button type="button" className="close-button" onClick={closeApp} aria-label="Fechar despertador">×</button>
    {!isRinging && <div className="picker-overlay"><div className="picker-container active-alarm">
      <div className="alarm-icon active" aria-hidden="true">⏰</div><span className="small-title">Despertador</span><h1>Alarme diário definido</h1>
      <div className="top-clock"><span>{alarmTime}</span><span className="clock-icon" aria-hidden="true">⏰</span></div>
      <p className="description">Escolha o horário em que deseja despertar.</p>
      <input type="time" className="picker-input" value={alarmTime} onChange={(event) => { const time = event.target.value; setAlarmTime(time); if (isValidAlarmTime(time)) window.electronAPI.setAlarmTime(time); }} />
      <button type="button" className="confirm-btn" onClick={() => window.electronAPI.testAlarm()}>Testar alarme agora</button>
      <p className="description">O despertador tocará automaticamente todos os dias no horário escolhido.</p>
    </div></div>}
    {isRinging && <div className="alarm-card"><div className="ring-badge" aria-hidden="true">🔔</div><div className="alarm-time">TOCANDO</div>
      {!canClose ? <p className="waiting">Aguarde 10 segundos para parar ou fechar.</p> : <div className="alarm-buttons"><button className="stop" onClick={stopAlarm}>Parar Alarme</button><button className="close-app" onClick={closeApp}>Fechar Despertador</button></div>}
    </div>}
  </div>;
}
