import { app, BrowserWindow, ipcMain, screen, powerSaveBlocker } from "electron";
import path from "path";

let alarmIsRinging = false;
let sharedAlarmTime: string = "";
let windows: BrowserWindow[] = [];

const createWindows = () => {
  const displays = screen.getAllDisplays();
  windows = [];

  for (const display of displays) {
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
      icon: path.join(__dirname, "assets", "alarm-icon.png"),
    });

    win.setMenuBarVisibility(false);

    win.on("close", (e) => {
      if (alarmIsRinging) e.preventDefault();
    });

    win.loadURL("http://localhost:5173");
    windows.push(win);
  }
};

ipcMain.on("set-alarm-status", (_, isRinging: boolean) => {
  alarmIsRinging = isRinging;
  windows.forEach((win) => {
    win.webContents.send("sync-alarm-status", isRinging);
  });
});

ipcMain.on("set-alarm-time", (_, time: string) => {
  sharedAlarmTime = time;
  windows.forEach((win) => {
    win.webContents.send("sync-alarm-time", sharedAlarmTime);
  });
});

ipcMain.handle("get-alarm-time", () => {
  return sharedAlarmTime;
});

ipcMain.on("force-close-all", () => {
  alarmIsRinging = false;
  windows.forEach((win) => win.destroy());
});

app.whenReady().then(() => {
  powerSaveBlocker.start("prevent-app-suspension");

  createWindows();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});



