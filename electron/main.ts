import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "path";

let alarmIsRinging = false;
let windows: BrowserWindow[] = [];

const createWindows = () => {
  const displays = screen.getAllDisplays();
  windows = [];

  displays.forEach((display, index) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: true,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    win.setMenuBarVisibility(false);

    win.on("close", (e) => {
      if (alarmIsRinging) e.preventDefault();
    });

    win.loadURL("http://localhost:5173");

    windows.push(win);
  });
};

ipcMain.on("set-alarm-status", (_, isRinging: boolean) => {
  alarmIsRinging = isRinging;
});

app.whenReady().then(() => {
  createWindows();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
