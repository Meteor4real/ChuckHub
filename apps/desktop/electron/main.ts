import { app, BrowserWindow, ipcMain, shell, session, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { setupTracking } from "./tracking";

// In a CJS build __dirname exists; guard for ESM just in case.
const dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

// Background prefs — stored on disk so the user's choices survive restarts.
// Default OFF on first run. The previous default-ON behavior shipped a
// silently-tray-resident, launch-on-boot app, which read as malware to anyone
// who installed it. Opt-in only — toggles surface in the tray menu + the
// Background card in Projects.
type BgPrefs = { minimizeToTray: boolean; runOnStartup: boolean };
// v2: distinct path so installs that opted into the old default-ON behavior
// don't carry it forward silently. The legacy bg-prefs.json (default-ON era)
// is ignored; the user gets a clean opt-out by default and can re-enable
// either toggle from the tray menu.
function bgPrefsPath() { return path.join(app.getPath("userData"), "bg-prefs.v2.json"); }
function readBgPrefs(): BgPrefs {
  try { return { minimizeToTray: false, runOnStartup: false, ...JSON.parse(fs.readFileSync(bgPrefsPath(), "utf8")) }; }
  catch { return { minimizeToTray: false, runOnStartup: false }; }
}
function writeBgPrefs(p: BgPrefs) {
  try { fs.mkdirSync(path.dirname(bgPrefsPath()), { recursive: true }); fs.writeFileSync(bgPrefsPath(), JSON.stringify(p)); } catch { /* ignore */ }
}
function applyBgPrefs(p: BgPrefs) {
  if (process.platform !== "linux") {
    try { app.setLoginItemSettings({ openAtLogin: !!p.runOnStartup, openAsHidden: true }); } catch { /* ignore */ }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#19140F", // Papatui espresso — matches the default theme so boot doesn't flash a foreign color
    show: false,
    autoHideMenuBar: true,
    useContentSize: true,
    title: "MoreMe",
    webPreferences: {
      preload: path.join(dir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // tabbed browser uses <webview>
      // Keep timers running at full speed when the window is minimized or
      // hidden to tray, so MoreMe's reminder ticks + calendar-feed sync +
      // the NT5 wire keep working in the background instead of being
      // throttled.
      backgroundThrottling: false,
      defaultFontSize: 16,
      defaultMonospaceFontSize: 14,
      minimumFontSize: 11,
    },
  });

  win.once("ready-to-show", () => win?.show());

  // External target=_blank links open in the OS browser, not new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(dir, "../dist/index.html"));
  }

  // When the user closes the window AND they've opted into "minimize to tray",
  // hide instead of destroy — the renderer keeps running so the NT5 wire
  // scheduler + Origin Realms poll + AI session stay alive in the background.
  win.on("close", (e) => {
    if (quitting) return;
    if (readBgPrefs().minimizeToTray) {
      e.preventDefault();
      win?.hide();
    }
  });
  win.on("closed", () => { win = null; });
}

function ensureTray() {
  if (tray) return tray;
  const iconPath = path.join(dir, "../build/icon.png");
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) img = nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip("MoreMe — running in the background");
  refreshTrayMenu();
  tray.on("click", () => { if (win) { win.show(); win.focus(); } else createWindow(); });
  return tray;
}
function refreshTrayMenu() {
  if (!tray) return;
  const p = readBgPrefs();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show MoreMe", click: () => { if (win) { win.show(); win.focus(); } else createWindow(); } },
    { type: "separator" },
    { label: "Run on system startup", type: "checkbox", checked: p.runOnStartup, click: (m) => { const next = { ...p, runOnStartup: !!m.checked }; writeBgPrefs(next); applyBgPrefs(next); refreshTrayMenu(); } },
    { label: "Close button hides to tray (keeps MoreMe running)", type: "checkbox", checked: p.minimizeToTray, click: (m) => { const next = { ...p, minimizeToTray: !!m.checked }; writeBgPrefs(next); refreshTrayMenu(); } },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
}

app.whenReady().then(() => {
  configureSecurity();
  registerIpc();
  setupTracking();
  ensureTray();
  applyBgPrefs(readBgPrefs());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("before-quit", () => { quitting = true; });

// Harden every webview the renderer creates: no node, context-isolated, no
// extra preload, external links to the OS browser.
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (_evt, webPreferences) => {
    delete (webPreferences as { preload?: string }).preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    // Match the host BrowserWindow's font defaults so embedded pages don't
    // get Chromium's smaller-than-default fallback that made them look
    // compressed. defaultFontSize 16 = standard browser; minimumFontSize 12
    // keeps small text legible on dense sites without aggressive overrides.
    // zoomFactor:1.0 makes sure we don't inherit a sub-100% factor from the
    // host BrowserWindow's session state, which is the most likely cause of
    // pages looking shrunk even after the font defaults were set.
    (webPreferences as { defaultFontSize?: number }).defaultFontSize = 16;
    (webPreferences as { defaultMonospaceFontSize?: number }).defaultMonospaceFontSize = 14;
    (webPreferences as { minimumFontSize?: number }).minimumFontSize = 12;
    (webPreferences as { zoomFactor?: number }).zoomFactor = 1.0;
  });

  // Belt-and-suspenders: clamp every newly-attached webContents to zoomFactor 1
  // on creation. Some Chromium internals propagate the parent BrowserWindow's
  // zoom factor onto child webContents before the will-attach-webview prefs
  // apply, which is what was making pages render "compressed".
  contents.on("did-attach-webview" as never, (_e: unknown, wc: { setVisualZoomLevelLimits?: (a: number, b: number) => void; setZoomFactor?: (n: number) => void }) => {
    try { wc.setZoomFactor?.(1.0); } catch { /* ignore */ }
    try { wc.setVisualZoomLevelLimits?.(1, 5); } catch { /* ignore */ }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
});

// ---------------------------------------------------------------------------
// Browser security (DuckDuckGo-style): tracker blocking, HTTPS-upgrade on
// top-level navigations, DNT/GPC headers, deny-by-default permissions, and a
// de-fingerprinted user agent. Applied to both the default and hub sessions.
// ---------------------------------------------------------------------------

const TRACKER_HOSTS = [
  "doubleclick.net", "googlesyndication.com", "google-analytics.com",
  "googletagmanager.com", "adservice.google.com", "scorecardresearch.com",
  "quantserve.com", "adnxs.com", "criteo.com", "taboola.com", "outbrain.com",
  "connect.facebook.net", "facebook.net", "hotjar.com", "mixpanel.com",
  "segment.com", "segment.io", "amplitude.com", "fullstory.com",
  "doubleverify.com", "adsafeprotected.com", "moatads.com", "bat.bing.com",
  "ads-twitter.com", "analytics.tiktok.com", "pixel.facebook.com",
  "stats.g.doubleclick.net", "app-measurement.com", "branch.io",
];

function hostBlocked(rawUrl: string): boolean {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    return TRACKER_HOSTS.some((t) => h === t || h.endsWith("." + t));
  } catch {
    return false;
  }
}

const ALLOWED_PERMS = new Set(["fullscreen", "clipboard-sanitized-write"]);

// Camera/mic are allowed only for the app's OWN UI (HALOS Meet), never for
// remote sites loaded in browser webviews.
function isAppOrigin(u?: string): boolean {
  if (!u) return false;
  return u.startsWith("file://") || (!!DEV_URL && u.startsWith(DEV_URL));
}

// Crude registrable-domain (eTLD+1) for same-site comparison. Good enough for
// the common .com/.org/.io cases and multi-label TLDs like .co.uk.
function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const twoLevelTld = /^(co|com|org|net|gov|edu|ac)\.[a-z]{2}$/;
  const lastTwo = parts.slice(-2).join(".");
  return twoLevelTld.test(lastTwo) ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
}

function harden(ses: Electron.Session) {
  ses.webRequest.onBeforeRequest((details, cb) => {
    if (hostBlocked(details.url)) return cb({ cancel: true });
    // Upgrade insecure top-level navigations to HTTPS (skip localhost).
    if (
      details.resourceType === "mainFrame" &&
      details.url.startsWith("http://") &&
      !/^http:\/\/(localhost|127\.|\[::1\]|0\.0\.0\.0)/i.test(details.url)
    ) {
      return cb({ redirectURL: details.url.replace(/^http:/i, "https:") });
    }
    cb({});
  });

  ses.webRequest.onBeforeSendHeaders((details, cb) => {
    if (privacyState.dntGpc) {
      details.requestHeaders["DNT"] = "1";
      details.requestHeaders["Sec-GPC"] = "1";
    } else {
      delete details.requestHeaders["DNT"];
      delete details.requestHeaders["Sec-GPC"];
    }
    cb({ requestHeaders: details.requestHeaders });
  });

  // Third-party cookie blocking. When enabled, strip Set-Cookie from any
  // response whose registrable domain differs from the document that made the
  // request (looked up via the request's webContents top URL). Genuine 3p
  // cookie blocking, not just the tracker-host blocklist.
  ses.webRequest.onHeadersReceived((details, cb) => {
    if (!privacyState.block3p) return cb({ responseHeaders: details.responseHeaders });
    const headers = details.responseHeaders || {};
    const cookieKey = Object.keys(headers).find((k) => k.toLowerCase() === "set-cookie");
    if (!cookieKey) return cb({ responseHeaders: headers });
    try {
      const reqHost = new URL(details.url).hostname;
      let topHost = "";
      const wcId = (details as unknown as { webContentsId?: number }).webContentsId;
      if (typeof wcId === "number") {
        const wc = require("electron").webContents.fromId(wcId);
        if (wc) { try { topHost = new URL(wc.getURL()).hostname; } catch { /* ignore */ } }
      }
      if (topHost && registrableDomain(reqHost) !== registrableDomain(topHost)) {
        delete headers[cookieKey];
      }
    } catch { /* ignore */ }
    cb({ responseHeaders: headers });
  });

  ses.setPermissionRequestHandler((_wc, perm, cb, details) => {
    if (ALLOWED_PERMS.has(perm)) return cb(true);
    if (perm === "media" && isAppOrigin(details?.requestingUrl)) return cb(true);
    cb(false);
  });
  ses.setPermissionCheckHandler((_wc, perm, origin) => {
    if (ALLOWED_PERMS.has(perm)) return true;
    if (perm === "media" && isAppOrigin(origin)) return true;
    return false;
  });

  // Strip Electron's auto-injected " Electron/x.y.z" + product token from the
  // User-Agent so embedded sites can't fingerprint us as an Electron app.
  // app.getName() is driven by electron-builder's productName at runtime so
  // this stays correct if the product is ever renamed again.
  const productToken = new RegExp(` ${app.getName().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\/[\\d.]+`, "i");
  const ua = ses
    .getUserAgent()
    .replace(/ Electron\/[\d.]+/i, "")
    .replace(productToken, "");
  ses.setUserAgent(ua);
}

function configureSecurity() {
  harden(session.defaultSession);
  try {
    harden(session.fromPartition("persist:hub"));
  } catch {
    /* partition created lazily; will inherit on first use */
  }
  attachDownloads(session.defaultSession);
  try { attachDownloads(session.fromPartition("persist:hub")); } catch { /* same */ }
}

// --- Downloads ------------------------------------------------------------
type DownloadRec = { id: string; filename: string; path: string; url: string; bytes: number; state: "completed" | "interrupted" | "cancelled"; ts: number };
function downloadsPath() { return path.join(app.getPath("userData"), "downloads.json"); }
function readDownloads(): DownloadRec[] {
  try { return JSON.parse(fs.readFileSync(downloadsPath(), "utf8")) as DownloadRec[]; } catch { return []; }
}
function writeDownloads(arr: DownloadRec[]) {
  try {
    fs.mkdirSync(path.dirname(downloadsPath()), { recursive: true });
    fs.writeFileSync(downloadsPath(), JSON.stringify(arr.slice(0, 1000)));
  } catch { /* ignore */ }
}
function broadcastDownloads(win?: BrowserWindow) {
  const arr = readDownloads();
  const w = win ?? BrowserWindow.getAllWindows()[0];
  w?.webContents.send("downloads:updated", arr);
}
function attachDownloads(ses: Electron.Session) {
  ses.on("will-download", (_e, item) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 6);
    const savePath = path.join(app.getPath("downloads"), item.getFilename());
    item.setSavePath(savePath);
    item.on("done", (_evt, state) => {
      const rec: DownloadRec = {
        id,
        filename: item.getFilename(),
        path: savePath,
        url: item.getURL(),
        bytes: item.getTotalBytes(),
        state: state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "interrupted",
        ts: Date.now(),
      };
      const arr = [rec, ...readDownloads()];
      writeDownloads(arr);
      broadcastDownloads();
    });
  });
}

app.on("window-all-closed", () => {
  // If the user explicitly chose Quit (from tray or menu), let it through.
  // Otherwise — when we run in tray mode — staying alive is the point.
  if (quitting) { app.quit(); return; }
  if (process.platform === "darwin") return;
  // Non-mac: only quit if there's no tray running OR the user hasn't opted into
  // background mode. Tray + minimizeToTray means stay alive.
  if (!tray || !readBgPrefs().minimizeToTray) app.quit();
});

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerIpc() {
  // --- General JSON request (CORS-free) — used by Supabase auth, etc. ---
  ipcMain.handle(
    "net:request",
    async (_e, opts: { method: string; url: string; headers?: Record<string, string>; body?: unknown }) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(opts.url, {
          method: opts.method,
          headers: opts.headers,
          body: opts.body != null ? JSON.stringify(opts.body) : undefined,
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const txt = await res.text();
        let data: unknown = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch {
          data = txt;
        }
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, error: String(err) };
      }
    }
  );

  // --- Downloads — captured from webview sessions (will-download) ---
  ipcMain.handle("downloads:list", () => readDownloads());
  ipcMain.handle("downloads:clear", () => { writeDownloads([]); broadcastDownloads(); return { ok: true }; });
  ipcMain.handle("downloads:remove", (_e, id: string) => { writeDownloads(readDownloads().filter((d) => d.id !== id)); broadcastDownloads(); return { ok: true }; });
  ipcMain.handle("downloads:open", (_e, p: string) => shell.openPath(p));
  ipcMain.handle("downloads:reveal", (_e, p: string) => { shell.showItemInFolder(p); return { ok: true }; });

  // --- Background / Tray prefs — drives true cross-reboot "24/7" mode ---
  ipcMain.handle("bg:get", () => readBgPrefs());
  ipcMain.handle("bg:set", (_e, p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>) => {
    const next = { ...readBgPrefs(), ...p };
    writeBgPrefs(next);
    applyBgPrefs(next);
    refreshTrayMenu();
    return next;
  });
  ipcMain.handle("bg:quit", () => { quitting = true; app.quit(); });

  // --- System pulse — CPU load + free memory + free disk for the user's
  //     home volume. Used by the floating info widget. ---
  ipcMain.handle("sys:pulse", async () => {
    const cpus = os.cpus();
    let total = 0, idle = 0;
    for (const c of cpus) {
      idle += c.times.idle;
      total += c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle;
    }
    const cpuPct = total ? Math.round(100 * (1 - idle / total)) : 0;
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memPct = Math.round(100 * (1 - memFree / memTotal));
    let diskFree = 0, diskTotal = 0;
    try {
      const stats = fs.statfsSync(os.homedir());
      diskTotal = Number(stats.blocks) * Number(stats.bsize);
      diskFree = Number(stats.bfree) * Number(stats.bsize);
    } catch { /* not all platforms */ }
    return { cpuPct, memPct, memFreeGb: memFree / 1024 / 1024 / 1024, diskFreeGb: diskFree / 1024 / 1024 / 1024, diskTotalGb: diskTotal / 1024 / 1024 / 1024 };
  });

  // Privacy controls applied at the session level (renderer can't reach the
  // session directly). Re-applied on boot and whenever the user toggles them.
  ipcMain.handle("privacy:apply", (_e, p: { dntGpc?: boolean; block3p?: boolean }) => {
    try { applyPrivacy(p); return { ok: true }; } catch { return { ok: false }; }
  });
}

// Live privacy state, consulted by the header/cookie hooks installed in
// hardenSessions(). Defaults match the DDG-grade posture.
const privacyState = { dntGpc: true, block3p: true };
function applyPrivacy(p: { dntGpc?: boolean; block3p?: boolean }) {
  if (typeof p.dntGpc === "boolean") privacyState.dntGpc = p.dntGpc;
  if (typeof p.block3p === "boolean") privacyState.block3p = p.block3p;
}

