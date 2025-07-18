import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

let win: BrowserWindow | null = null;
let alarmIsRinging = false;

const createWindow = () => {
  console.log("Criando janela do Electron");

  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setMenuBarVisibility(false);

  win.on("close", (e) => {
    if (alarmIsRinging) {
      console.log("Tentaram fechar, mas alarme está tocando");
      e.preventDefault();
    }
  });

  win.loadURL("http://localhost:5173").then(() => {
    console.log("URL carregada com sucesso");
  }).catch((err) => {
    console.error("Erro ao carregar URL:", err);
  });
};

ipcMain.on("set-alarm-status", (_, isRinging: boolean) => {
  alarmIsRinging = isRinging;
  console.log("Alarme está tocando?", isRinging);
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
