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
      setAlarmStatus: (status: boolean) => void;
      forceCloseAll: () => void;
      setAlarmTime: (time: string) => void;
      getAlarmTime: () => Promise<string>;
      onSyncAlarmTime: (callback: (time: string) => void) => void;
      onSyncAlarmStatus: (callback: (status: boolean) => void) => void;
    };
  }
}