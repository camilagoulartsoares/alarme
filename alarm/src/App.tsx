import { useEffect, useRef, useState } from 'react'
import './App.css'

export default function App() {
  const [alarmTime, setAlarmTime] = useState('')
  const [isRinging, setIsRinging] = useState(false)
  const [canStop, setCanStop] = useState(false)
  const audioRef = useRef(new Audio('/assets/alarm.mp3'))
  const intervalRef = useRef<number>()

  useEffect(() => {
    if (alarmTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        const current = now.toTimeString().slice(0, 5)
        if (current === alarmTime && !isRinging) {
          triggerAlarm()
        }
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [alarmTime])

  const triggerAlarm = () => {
    const audio = audioRef.current
    setIsRinging(true)
    audio.loop = true
    audio.volume = 0
    audio.play()
    fadeInVolume(audio)
    setCanStop(false)

    setTimeout(() => setCanStop(true), 5 * 60 * 1000)
  }

  const fadeInVolume = (audio: HTMLAudioElement) => {
    const interval = setInterval(() => {
      if (audio.volume < 1) {
        audio.volume = Math.min(1, audio.volume + 0.01)
      } else {
        clearInterval(interval)
      }
    }, 300)
  }

  const stopAlarm = () => {
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setIsRinging(false)
    setAlarmTime('')
    clearInterval(intervalRef.current)
  }

  const repeatAlarm = () => {
    stopAlarm()
    const [h, m] = alarmTime.split(':').map(Number)
    const next = new Date()
    next.setHours(h)
    next.setMinutes(m + 5)
    const formatted = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
    setAlarmTime(formatted)
  }

  return (
    <div className="alarm-wrapper">
      {!isRinging && (
        <input
          type="time"
          className="alarm-input"
          value={alarmTime}
          onChange={(e) => setAlarmTime(e.target.value)}
        />
      )}

      {alarmTime && (
        <div className="alarm-card">
          <div className="alarm-time">
            {alarmTime}
            <span className="am-pm">AM</span>
          </div>

          <div className="alarm-label">Hora do Alarme</div>

          <div className="alarm-buttons">
            <button className="stop" onClick={stopAlarm} disabled={!canStop}>
              Parar Alarme
            </button>
            <button className="repeat" onClick={repeatAlarm} disabled={!canStop}>
              Repetir Alarme
            </button>
          </div>

          {isRinging && !canStop && (
            <p className="waiting">Espere 5 minutos para parar o alarme</p>
          )}
        </div>
      )}
    </div>
  )
}
