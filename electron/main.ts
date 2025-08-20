import { app, BrowserWindow, ipcMain, screen, powerSaveBlocker, globalShortcut } from "electron";
import path from "path";
import { execFile, ChildProcess } from "child_process";
import fs from "fs";

let alarmIsRinging = false;
let sharedAlarmTime: string = "";
let windows: BrowserWindow[] = [];
let keyBlockerProc: ChildProcess | null = null;


const candidatesAhkExe = [
  "C:\\Program Files\\AutoHotkey\\AutoHotkeyU64.exe",
  "C:\\Program Files\\AutoHotkey\\AutoHotkey.exe",
  "C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe"
];


const resolveAsset = (p: string) => {
  const devTry = path.join(process.cwd(), "src", "assets", p);
  if (fs.existsSync(devTry)) return devTry;
  const prodTry = path.join(process.resourcesPath, "assets", p);
  return prodTry;
};

const ahkScript = resolveAsset("block_keys.ahk");

const findAhkExe = () => {
  for (const p of candidatesAhkExe) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const startKeyBlocker = () => {
  if (keyBlockerProc) return;
  const ahkExe = findAhkExe();
  if (!ahkExe) return;
  keyBlockerProc = execFile(ahkExe, [ahkScript]);
};

const stopKeyBlocker = () => {
  if (!keyBlockerProc) return;
  try { keyBlockerProc.kill(); } catch {}
  keyBlockerProc = null;
};

const applyKiosk = (enable: boolean) => {
  windows.forEach((win) => {
    if (enable) {
      win.setAlwaysOnTop(true, "screen-saver");
      win.setKiosk(true);
      const onBlur = () => win.focus();
      win.removeAllListeners("blur");
      win.on("blur", onBlur);
      win.focus();
    } else {
      win.setKiosk(false);
      win.setAlwaysOnTop(false);
      win.removeAllListeners("blur");
    }
  });
};

const tryGrabWinR = (enable: boolean) => {
  if (enable) {
    try { globalShortcut.register("Super+R", () => {}); } catch {}
  } else {
    globalShortcut.unregister("Super+R");
  }
};

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
      webPreferences: { preload: path.join(__dirname, "preload.js") },
      icon: path.join(__dirname, "assets", "alarm-icon.png"),
    });
    win.setMenuBarVisibility(false);
    win.on("close", (e) => { if (alarmIsRinging) e.preventDefault(); });
    win.loadURL("http://localhost:5173");
    windows.push(win);
  }
};

ipcMain.on("set-alarm-status", (_, isRinging: boolean) => {
  alarmIsRinging = isRinging;
  if (isRinging) {
    startKeyBlocker();
    applyKiosk(true);
    tryGrabWinR(true);
  } else {
    stopKeyBlocker();
    applyKiosk(false);
    tryGrabWinR(false);
  }
  windows.forEach((win) => win.webContents.send("sync-alarm-status", isRinging));
});

ipcMain.on("set-alarm-time", (_, time: string) => {
  sharedAlarmTime = time;
  windows.forEach((win) => win.webContents.send("sync-alarm-time", sharedAlarmTime));
});

ipcMain.handle("get-alarm-time", () => sharedAlarmTime);

ipcMain.on("force-close-all", () => {
  alarmIsRinging = false;
  stopKeyBlocker();
  applyKiosk(false);
  tryGrabWinR(false);
  windows.forEach((win) => win.destroy());
});

app.whenReady().then(() => {
  powerSaveBlocker.start("prevent-app-suspension");
  createWindows();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("will-quit", () => {
  stopKeyBlocker();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


