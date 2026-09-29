import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

export {};

declare global {
  interface Window {
    electronAPI: {
      forceCloseAll: () => void;
      setAlarmTime: (time: string) => void;
      getAlarmTime: () => Promise<string>;
      getAlarmState: () => Promise<{
        alarmTime: string;
        status: "armed" | "ringing";
      }>;
      testAlarm: () => void;
      alarmStopped: () => void;
      onSyncAlarmTime: (callback: (time: string) => void) => () => void;
      onAlarmTriggered: (
        callback: (kind: "scheduled" | "recovery" | "test") => void
      ) => () => void;
    };
  }
}
