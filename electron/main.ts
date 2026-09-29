import { app, BrowserWindow, ipcMain, powerMonitor, powerSaveBlocker, screen, globalShortcut } from "electron";
import path from "path";
import { execFile, ChildProcess } from "child_process";
import fs from "fs";

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const DEV_SERVER_URL = "http://localhost:5180";
const DEFAULT_ALARM_TIME = "04:00";
const RECOVERY_DELAY_MS = 20 * 60 * 1000;
const ALARM_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
type AlarmStatus = "armed" | "ringing";
type AlarmKind = "scheduled" | "recovery" | "test";
interface AlarmSettings { alarmTime: string; status: AlarmStatus; nextTriggerAt: string; activeKind?: AlarmKind; activeTriggerAt?: string; lastHeartbeatAt?: string; lastStartedAt?: string; lastShutdownAt?: string; cleanShutdown?: boolean; }
let alarmSettings: AlarmSettings;
let alarmLocked = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let windows: BrowserWindow[] = [];
let keyBlockerProc: ChildProcess | null = null;
let powerSaveBlockerId: number | null = null;
const candidatesAhkExe = ["C:\\Program Files\\AutoHotkey\\AutoHotkeyU64.exe", "C:\\Program Files\\AutoHotkey\\AutoHotkey.exe", "C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe"];
const settingsPath = () => path.join(app.getPath("userData"), "alarm-settings.json");
const logPath = () => path.join(app.getPath("userData"), "logs", "alarm.log");
const isValidAlarmTime = (time: unknown): time is string => typeof time === "string" && ALARM_TIME_PATTERN.test(time);
const iso = (date = new Date()) => date.toISOString();

function log(event: string, details: Record<string, unknown> = {}) {
  const line = `${iso()} ${event} ${JSON.stringify(details)}\n`;
  try { fs.mkdirSync(path.dirname(logPath()), { recursive: true }); fs.appendFileSync(logPath(), line, "utf8"); } catch (error) { console.error("Não foi possível gravar o log:", error); }
  console.log(line.trim());
}
function nextOccurrence(time: string, from = new Date()) {
  const [hours, minutes] = time.split(":").map(Number); const result = new Date(from);
  result.setHours(hours, minutes, 0, 0); if (result.getTime() <= from.getTime()) result.setDate(result.getDate() + 1); return result;
}
function occurrenceToday(time: string, from = new Date()) {
  const [hours, minutes] = time.split(":").map(Number); const result = new Date(from);
  result.setHours(hours, minutes, 0, 0); return result;
}
function defaultSettings(): AlarmSettings { return { alarmTime: DEFAULT_ALARM_TIME, status: "armed", nextTriggerAt: iso(nextOccurrence(DEFAULT_ALARM_TIME)) }; }
function saveSettings() {
  try { fs.mkdirSync(path.dirname(settingsPath()), { recursive: true }); const temporary = `${settingsPath()}.tmp`; fs.writeFileSync(temporary, JSON.stringify(alarmSettings, null, 2), "utf8"); fs.renameSync(temporary, settingsPath()); }
  catch (error) { log("settings-save-failed", { error: String(error) }); }
}
function loadSettings() {
  try {
    if (!fs.existsSync(settingsPath())) { alarmSettings = defaultSettings(); saveSettings(); log("settings-created", { alarmTime: alarmSettings.alarmTime }); return; }
    const data = JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as Partial<AlarmSettings>;
    const alarmTime = isValidAlarmTime(data.alarmTime) ? data.alarmTime : DEFAULT_ALARM_TIME;
    const hasPersistedSchedule = typeof data.nextTriggerAt === "string" && !Number.isNaN(Date.parse(data.nextTriggerAt));
    // Migração do formato antigo, que só tinha alarmTime: preserva a ocorrência de hoje para não ocultar um alarme já perdido.
    alarmSettings = { alarmTime, status: data.status === "ringing" ? "ringing" : "armed", nextTriggerAt: hasPersistedSchedule ? data.nextTriggerAt! : iso(occurrenceToday(alarmTime)), activeKind: data.activeKind, activeTriggerAt: data.activeTriggerAt, lastHeartbeatAt: data.lastHeartbeatAt, lastStartedAt: data.lastStartedAt, lastShutdownAt: data.lastShutdownAt, cleanShutdown: data.cleanShutdown };
    if (!hasPersistedSchedule) log("settings-migrated-from-time-only", { alarmTime, migratedTriggerAt: alarmSettings.nextTriggerAt });
  } catch (error) { alarmSettings = defaultSettings(); log("settings-load-failed", { error: String(error) }); saveSettings(); }
}
function sendToRenderers(channel: string, ...args: unknown[]) { for (const win of windows) if (!win.isDestroyed()) win.webContents.send(channel, ...args); }
const resolveAsset = (file: string) => { const dev = path.join(process.cwd(), "src", "assets", file); return fs.existsSync(dev) ? dev : path.join(process.resourcesPath, "assets", file); };
function startKeyBlocker() { if (keyBlockerProc) return; const ahk = candidatesAhkExe.find(fs.existsSync); if (ahk) keyBlockerProc = execFile(ahk, [resolveAsset("block_keys.ahk")]); }
function stopKeyBlocker() { try { keyBlockerProc?.kill(); } catch {} keyBlockerProc = null; }
function applyKiosk(enable: boolean) {
  for (const win of windows) { if (win.isDestroyed()) continue; if (enable) { win.setAlwaysOnTop(true, "screen-saver"); win.setKiosk(true); win.setClosable(false); win.removeAllListeners("blur"); win.on("blur", () => { if (alarmLocked && !win.isDestroyed()) win.focus(); }); win.show(); win.focus(); } else { win.setKiosk(false); win.setAlwaysOnTop(false); win.setClosable(true); win.removeAllListeners("blur"); } }
}
function setLock(locked: boolean) { alarmLocked = locked; if (locked) { startKeyBlocker(); applyKiosk(true); try { globalShortcut.register("Super+R", () => {}); } catch {} } else { stopKeyBlocker(); applyKiosk(false); globalShortcut.unregister("Super+R"); } sendToRenderers("sync-alarm-status", locked); }
function scheduleRecovery(reason: string) {
  const missedTriggerAt = alarmSettings.activeTriggerAt ?? alarmSettings.nextTriggerAt;
  alarmSettings.status = "armed"; alarmSettings.activeKind = undefined; alarmSettings.activeTriggerAt = undefined; alarmSettings.nextTriggerAt = iso(new Date(Date.now() + RECOVERY_DELAY_MS)); saveSettings();
  log("alarm-recovery-scheduled", { reason, missedTriggerAt, recoveryTriggerAt: alarmSettings.nextTriggerAt, lastHeartbeatAt: alarmSettings.lastHeartbeatAt });
}
function triggerAlarm(kind: AlarmKind) {
  const scheduledFor = alarmSettings.nextTriggerAt;
  if (kind !== "test") { alarmSettings.status = "ringing"; alarmSettings.activeKind = kind; alarmSettings.activeTriggerAt = scheduledFor; alarmSettings.nextTriggerAt = iso(nextOccurrence(alarmSettings.alarmTime)); saveSettings(); }
  setLock(true); sendToRenderers("alarm-triggered", kind); log("alarm-triggered", { kind, scheduledFor, nextTriggerAt: alarmSettings.nextTriggerAt });
}
function checkSchedule(origin: string) {
  if (alarmSettings.status === "ringing") return;
  const nextAt = Date.parse(alarmSettings.nextTriggerAt); if (Number.isNaN(nextAt)) { alarmSettings.nextTriggerAt = iso(nextOccurrence(alarmSettings.alarmTime)); saveSettings(); log("schedule-rebuilt", { origin }); return; }
  if (Date.now() >= nextAt) { if (Date.now() - nextAt > 60_000) scheduleRecovery(`${origin}-missed`); else triggerAlarm("scheduled"); }
}
function armScheduler() {
  if (schedulerTimer) clearTimeout(schedulerTimer);
  const nextAt = Date.parse(alarmSettings.nextTriggerAt);
  // Um timer calculado evita o atraso de até 15 s que existia no polling.
  // Enquanto toca, o próximo horário só será avaliado quando o usuário parar o alarme.
  const delay = alarmSettings.status === "ringing" || Number.isNaN(nextAt)
    ? 60_000
    : Math.min(Math.max(nextAt - Date.now(), 1), 2_147_483_647);
  schedulerTimer = setTimeout(() => {
    checkSchedule("scheduler");
    armScheduler();
  }, delay);
}
function recoverOnStartup() {
  const nextAt = Date.parse(alarmSettings.nextTriggerAt);
  const lastHeartbeatAt = Date.parse(alarmSettings.lastHeartbeatAt ?? "");
  const alarmWasPendingDuringDowntime = !Number.isNaN(nextAt) && nextAt <= Date.now() &&
    (Number.isNaN(lastHeartbeatAt) || lastHeartbeatAt < nextAt);
  log("app-starting", { previousCleanShutdown: alarmSettings.cleanShutdown === true, previousHeartbeatAt: alarmSettings.lastHeartbeatAt, nextTriggerAt: alarmSettings.nextTriggerAt, status: alarmSettings.status });
  if (alarmSettings.status === "ringing" || (!Number.isNaN(nextAt) && nextAt <= Date.now())) {
    scheduleRecovery(alarmSettings.status === "ringing" ? "startup-while-ringing" : alarmWasPendingDuringDowntime ? "startup-missed-during-downtime" : "startup-missed");
  }
  alarmSettings.cleanShutdown = false; alarmSettings.lastStartedAt = iso(); alarmSettings.lastHeartbeatAt = iso(); saveSettings();
}
function markHeartbeat() { alarmSettings.lastHeartbeatAt = iso(); saveSettings(); }
function createWindows() {
  windows = [];
  for (const display of screen.getAllDisplays()) {
    const win = new BrowserWindow({ x: display.bounds.x, y: display.bounds.y, width: 760, height: 720, fullscreen: false, frame: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }, icon: path.join(__dirname, "assets", "alarm-icon.png") });
    win.setMenuBarVisibility(false); win.on("close", (event) => { if (alarmLocked) { event.preventDefault(); win.show(); win.focus(); } });
    win.webContents.on("did-finish-load", () => { log("renderer-loaded", { windowId: win.id }); win.webContents.send("sync-alarm-time", alarmSettings.alarmTime); if (alarmSettings.status === "ringing" || alarmLocked) win.webContents.send("alarm-triggered", alarmSettings.activeKind ?? "test"); });
    win.webContents.on("did-fail-load", (_event, code, description, url) => { log("renderer-load-failed", { windowId: win.id, code, description, url }); setTimeout(() => { if (!win.isDestroyed()) win.reload(); }, 1000); });
    win.webContents.on("render-process-gone", (_event, details) => { log("renderer-process-gone", { windowId: win.id, reason: details.reason, exitCode: details.exitCode }); setTimeout(() => { if (!win.isDestroyed()) win.webContents.reloadIgnoringCache(); }, 1000); });
    win.webContents.on("unresponsive", () => log("renderer-unresponsive", { windowId: win.id })); win.webContents.on("responsive", () => log("renderer-responsive", { windowId: win.id }));
    win.webContents.on("console-message", (_event, level, message, line, sourceId) => { if (level >= 2) log("renderer-console-error", { windowId: win.id, level, message, line, sourceId }); });
    if (app.isPackaged) win.loadFile(path.join(__dirname, "../dist/index.html")); else win.loadURL(DEV_SERVER_URL).catch((error) => log("renderer-load-url-failed", { error: String(error) })); windows.push(win);
  }
  if (alarmLocked) applyKiosk(true);
}
ipcMain.on("set-alarm-time", (_event, time: string) => { if (!isValidAlarmTime(time)) return; alarmSettings.alarmTime = time; alarmSettings.status = "armed"; alarmSettings.activeKind = undefined; alarmSettings.activeTriggerAt = undefined; alarmSettings.nextTriggerAt = iso(nextOccurrence(time)); saveSettings(); setLock(false); armScheduler(); sendToRenderers("sync-alarm-time", time); log("alarm-time-changed", { time, nextTriggerAt: alarmSettings.nextTriggerAt }); });
ipcMain.handle("get-alarm-time", () => alarmSettings.alarmTime);
ipcMain.handle("get-alarm-state", () => ({ ...alarmSettings }));
ipcMain.on("test-alarm", () => triggerAlarm("test"));
ipcMain.on("alarm-stopped", () => { const wasTest = alarmSettings.activeKind === "test" || alarmSettings.status !== "ringing"; if (!wasTest) { alarmSettings.status = "armed"; alarmSettings.activeKind = undefined; alarmSettings.activeTriggerAt = undefined; saveSettings(); } setLock(false); armScheduler(); log("alarm-stopped", { wasTest, nextTriggerAt: alarmSettings.nextTriggerAt }); });
ipcMain.on("force-close-all", () => { setLock(false); log("app-close-requested"); for (const win of windows) if (!win.isDestroyed()) win.destroy(); app.quit(); });
app.whenReady().then(() => { loadSettings(); recoverOnStartup(); powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension"); armScheduler(); heartbeatTimer = setInterval(markHeartbeat, 30_000); powerMonitor.on("suspend", () => log("system-suspend")); powerMonitor.on("resume", () => { log("system-resume"); checkSchedule("system-resume"); armScheduler(); }); createWindows(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindows(); }); });
app.on("before-quit", () => { if (alarmSettings) { alarmSettings.cleanShutdown = true; alarmSettings.lastShutdownAt = iso(); markHeartbeat(); log("app-normal-shutdown"); } });
app.on("will-quit", () => { if (schedulerTimer) clearTimeout(schedulerTimer); if (heartbeatTimer) clearInterval(heartbeatTimer); if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) powerSaveBlocker.stop(powerSaveBlockerId); stopKeyBlocker(); globalShortcut.unregisterAll(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
process.on("uncaughtException", (error) => log("main-uncaught-exception", { error: error.stack ?? String(error) }));
process.on("unhandledRejection", (reason) => log("main-unhandled-rejection", { reason: String(reason) }));
