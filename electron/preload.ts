import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  setAlarmStatus: (status: boolean) => ipcRenderer.send("set-alarm-status", status),
  forceCloseAll: () => ipcRenderer.send("force-close-all"),
  setAlarmTime: (time: string) => ipcRenderer.send("set-alarm-time", time),
  getAlarmTime: (): Promise<string> => ipcRenderer.invoke("get-alarm-time"),
  onSyncAlarmTime: (callback: (time: string) => void) =>
    ipcRenderer.on("sync-alarm-time", (_, time: string) => callback(time)),
  onSyncAlarmStatus: (callback: (status: boolean) => void) =>
    ipcRenderer.on("sync-alarm-status", (_, status: boolean) => callback(status)),
});
