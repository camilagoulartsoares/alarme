import { contextBridge, ipcRenderer } from "electron";

function subscribe<T extends unknown[]>(channel: string, callback: (...args: T) => void) {
  const listener = (_event: Electron.IpcRendererEvent, ...args: T) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("electronAPI", {
  forceCloseAll: () => ipcRenderer.send("force-close-all"),
  setAlarmTime: (time: string) => ipcRenderer.send("set-alarm-time", time),
  getAlarmTime: (): Promise<string> => ipcRenderer.invoke("get-alarm-time"),
  getAlarmState: () => ipcRenderer.invoke("get-alarm-state"),
  testAlarm: () => ipcRenderer.send("test-alarm"),
  alarmStopped: () => ipcRenderer.send("alarm-stopped"),
  onSyncAlarmTime: (callback: (time: string) => void) => subscribe("sync-alarm-time", callback),
  onAlarmTriggered: (callback: (kind: "scheduled" | "recovery" | "test") => void) => subscribe("alarm-triggered", callback),
});
