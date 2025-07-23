import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  setAlarmStatus: (status: boolean) => ipcRenderer.send("set-alarm-status", status),
  forceCloseAll: () => ipcRenderer.send("force-close-all"),
});
