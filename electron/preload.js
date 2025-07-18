const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  setAlarmStatus: (status) => ipcRenderer.send("set-alarm-status", status),
})
