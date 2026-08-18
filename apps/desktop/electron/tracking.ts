// MoreMe — OS-level foreground tracking. Opt-in by design (the user has to
// flip a switch). Polls the active window every 5 seconds via platform-
// native shell commands (no native node deps to compile):
//   Windows: PowerShell using user32!GetForegroundWindow + GetWindowText
//   macOS:   `osascript` AppleScript against System Events
//   Linux:   `xdotool getactivewindow getwindowname` (+ getwindowpid → /proc)
//
// Browser tabs: most browsers put the foreground tab's title in the window
// title (e.g. "YouTube — Google Chrome"). We parse "<tab> - <browser>" so
// each tab transition becomes its own session entry. Background tabs are
// not visible without a browser extension; this is the practical signal.
//
// Sessions are accumulated and flushed to disk (userData/tracking.json) so
// they survive restarts. The renderer reads via IPC tracking:report.

import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";

const POLL_MS = 5_000;

export type TrackingPrefs = { enabled: boolean };
export type AppSession = {
  app: string;       // process / app name
  title: string;     // window title (often "<tab> — <browser>")
  tab?: string;      // parsed tab title (browsers only)
  browser?: string;  // browser name when tab is set
  start: number;     // ms epoch
  end: number;       // ms epoch
  durationMs: number;
};

function prefsPath() { return path.join(app.getPath("userData"), "tracking-prefs.json"); }
function dataPath()  { return path.join(app.getPath("userData"), "tracking.json"); }

export function readPrefs(): TrackingPrefs {
  try { return { enabled: false, ...JSON.parse(fs.readFileSync(prefsPath(), "utf8")) }; }
  catch { return { enabled: false }; }
}
function writePrefs(p: TrackingPrefs) {
  try { fs.mkdirSync(path.dirname(prefsPath()), { recursive: true }); fs.writeFileSync(prefsPath(), JSON.stringify(p)); } catch { /* ignore */ }
}

type AllSessions = { sessions: AppSession[] };
function readSessions(): AllSessions {
  try { const j = JSON.parse(fs.readFileSync(dataPath(), "utf8")); return { sessions: Array.isArray(j?.sessions) ? j.sessions : [] }; }
  catch { return { sessions: [] }; }
}
function writeSessions(s: AllSessions) {
  // Keep at most 30 days of sessions on disk so it can't run away.
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const trimmed = s.sessions.filter((x) => x.end >= cutoff);
  try { fs.writeFileSync(dataPath(), JSON.stringify({ sessions: trimmed })); } catch { /* ignore */ }
}

const BROWSER_HINTS = ["Google Chrome", "Chromium", "Firefox", "Microsoft Edge", "Safari", "Brave", "Opera", "Vivaldi", "Arc"];

// Parse "Tab Title — Browser" / "Tab Title - Browser". Most modern browsers
// use one of em-dash, en-dash, or hyphen as separator.
function parseTitle(raw: string): { tab?: string; browser?: string } {
  const t = raw.trim();
  for (const sep of [" — ", " – ", " - "]) {
    const i = t.lastIndexOf(sep);
    if (i > 0) {
      const after = t.slice(i + sep.length).trim();
      if (BROWSER_HINTS.includes(after)) return { tab: t.slice(0, i).trim(), browser: after };
    }
  }
  return {};
}

// Linux tracking depends on xdotool being installed — it isn't bundled and
// isn't a default package on most distros, so a missing binary is a common,
// specific, and previously-silent failure mode. Checked lazily once.
let xdotoolChecked = false;
let xdotoolMissing = false;
function checkXdotool() {
  if (xdotoolChecked || process.platform !== "linux") return;
  xdotoolChecked = true;
  exec("which xdotool", { timeout: 2000 }, (err) => { xdotoolMissing = !!err; });
}

export type QueryFailReason = "no-binary" | "timeout" | "denied" | "command-failed" | "no-window";

// Returns "<process/app name>|<window title>" or null + a reason on failure.
function queryActiveWindow(): Promise<{ app: string; title: string } | { fail: QueryFailReason; detail?: string }> {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === "linux") checkXdotool();
    let cmd = "";
    if (platform === "win32") {
      // PowerShell oneliner using PInvoke to call GetForegroundWindow +
      // GetWindowText + GetWindowThreadProcessId, then Get-Process for app name.
      //
      // Bug history: this used `$pid` for the out-param, which is a reserved
      // PowerShell auto-variable bound to the current process. Writing to it
      // either silently no-oped or surfaced an error, so the whole query
      // returned empty and tracking looked broken on Windows. Rename to
      // $procId. Also pass the C# source to Add-Type as -TypeDefinition
      // explicitly so PowerShell doesn't try to treat it as a path.
      cmd =
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "' +
        "$sig=@'\n" +
        "using System;using System.Runtime.InteropServices;using System.Text;\n" +
        "public class W{[DllImport(\\\"user32.dll\\\")]public static extern IntPtr GetForegroundWindow();" +
        "[DllImport(\\\"user32.dll\\\")]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);" +
        "[DllImport(\\\"user32.dll\\\")]public static extern int GetWindowThreadProcessId(IntPtr h,out int procId);}\n" +
        "'@; Add-Type -TypeDefinition $sig; " +
        "$h=[W]::GetForegroundWindow(); $sb=New-Object System.Text.StringBuilder 512; [void][W]::GetWindowText($h,$sb,512); " +
        "$procId=0; [void][W]::GetWindowThreadProcessId($h,[ref]$procId); " +
        "$proc=(Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName; " +
        "Write-Output \"$proc|$($sb.ToString())\"\"";
    } else if (platform === "darwin") {
      cmd =
        "osascript -e 'tell application \"System Events\" to set p to first application process whose frontmost is true' " +
        "-e 'tell p to set wn to (name of front window)' " +
        "-e 'set an to name of p' " +
        "-e 'return an & \"|\" & wn'";
    } else {
      // Linux — depends on xdotool being installed.
      cmd = "bash -c 'name=$(xdotool getactivewindow getwindowname 2>/dev/null); pid=$(xdotool getactivewindow getwindowpid 2>/dev/null); proc=$(cat /proc/$pid/comm 2>/dev/null); echo \"$proc|$name\"'";
    }
    if (platform === "linux" && xdotoolMissing) { resolve({ fail: "no-binary" }); return; }
    // Windows spawns a fresh PowerShell + Add-Type (C# JIT compile) every
    // single tick — genuinely slow, and easily blown past 3s under AV
    // scanning of newly-spawned powershell.exe. Give it more room than the
    // other platforms' plain shell/osascript calls need.
    const timeoutMs = platform === "win32" ? 8000 : 3000;
    exec(cmd, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        // exec sets `killed: true` ONLY when it killed the process itself
        // because the `timeout` option elapsed — an unambiguous signal,
        // not a guess. Anything else is a real command failure.
        if (err.killed) { resolve({ fail: "timeout", detail: `no reply after ${timeoutMs / 1000}s` }); return; }
        if ((err as NodeJS.ErrnoException).code === "ENOENT") { resolve({ fail: "no-binary" }); return; }
        const errText = `${stderr || ""} ${err.message || ""}`.toLowerCase();
        // macOS: AppleEvents/Automation permission denial has a specific,
        // documented shape (osascript error -1743, or this exact phrase) —
        // checked for real, not assumed.
        if (platform === "darwin" && (errText.includes("not allowed") || errText.includes("not authorized") || errText.includes("-1743"))) {
          resolve({ fail: "denied" }); return;
        }
        resolve({ fail: "command-failed", detail: (stderr || err.message || "").trim().slice(0, 200) });
        return;
      }
      const raw = (stdout || "").trim();
      const i = raw.indexOf("|");
      if (i < 0) { resolve({ fail: "no-window" }); return; }
      const appName = raw.slice(0, i).trim();
      const title = raw.slice(i + 1).trim();
      if (!appName) { resolve({ fail: "no-window" }); return; }
      resolve({ app: appName, title });
    });
  });
}

let pollTimer: NodeJS.Timeout | null = null;
let prefs: TrackingPrefs = readPrefs();
let current: { app: string; title: string; tab?: string; browser?: string; start: number } | null = null;
let lastTickFailures = 0;
let lastFailReason: QueryFailReason | null = null;
let lastFailDetail: string | undefined;
let lastSuccessAt: number | null = null;

function key(app: string, title: string) {
  const parsed = parseTitle(title);
  return `${app}|${parsed.tab ?? title}|${parsed.browser ?? ""}`;
}

function flushCurrent(now: number) {
  if (!current) return;
  const dur = Math.max(0, now - current.start);
  if (dur < 1500) { current = null; return; } // ignore flicker
  const all = readSessions();
  all.sessions.push({
    app: current.app,
    title: current.title,
    tab: current.tab,
    browser: current.browser,
    start: current.start,
    end: now,
    durationMs: dur,
  });
  writeSessions(all);
  current = null;
}

async function tick() {
  if (!prefs.enabled) return;
  const w = await queryActiveWindow();
  if ("fail" in w) {
    lastTickFailures++;
    lastFailReason = w.fail;
    lastFailDetail = w.detail;
    // Five failures in a row probably means the OS query is just broken
    // on this machine. Flush the current session so we don't lie.
    if (lastTickFailures >= 5 && current) flushCurrent(Date.now());
    broadcast();
    return;
  }
  lastTickFailures = 0;
  lastFailReason = null;
  lastFailDetail = undefined;
  lastSuccessAt = Date.now();
  const parsed = parseTitle(w.title);
  const k = key(w.app, w.title);
  const now = Date.now();
  const curKey = current ? key(current.app, current.title) : null;
  if (curKey !== k) {
    flushCurrent(now);
    current = { app: w.app, title: w.title, tab: parsed.tab, browser: parsed.browser, start: now };
  }
  broadcast();
}

function diagnostics() {
  return { lastFailReason, lastFailDetail, lastSuccessAt, consecutiveFailures: lastTickFailures };
}

function broadcast() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("tracking:tick", { enabled: prefs.enabled, current, ...diagnostics() });
  }
}

export function setupTracking() {
  const start = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => { void tick(); }, POLL_MS);
    void tick();
  };
  const stop = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    flushCurrent(Date.now());
  };
  if (prefs.enabled) start();

  ipcMain.handle("tracking:get", () => ({ prefs, current, ...diagnostics() }));
  ipcMain.handle("tracking:set", (_e, next: Partial<TrackingPrefs>) => {
    prefs = { ...prefs, ...next };
    writePrefs(prefs);
    if (prefs.enabled) start();
    else stop();
    broadcast();
    return prefs;
  });
  ipcMain.handle("tracking:report", (_e, args?: { sinceMs?: number }) => {
    const since = typeof args?.sinceMs === "number" ? args.sinceMs : 0;
    const { sessions } = readSessions();
    return { sessions: sessions.filter((x) => x.end >= since) };
  });
  ipcMain.handle("tracking:clear", () => {
    writeSessions({ sessions: [] });
    return { ok: true };
  });

  app.on("before-quit", () => { stop(); });
}
