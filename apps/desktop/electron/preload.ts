import { contextBridge, ipcRenderer } from "electron";

// Context-isolated bridge. The renderer never touches Node/Electron directly.
const api = {
  net: (opts: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> =>
    ipcRenderer.invoke("net:request", opts),

  privacy: {
    apply: (p: { dntGpc?: boolean; block3p?: boolean }): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("privacy:apply", p),
  },

  bg: {
    get: (): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> => ipcRenderer.invoke("bg:get"),
    set: (p: Partial<{ minimizeToTray: boolean; runOnStartup: boolean }>): Promise<{ minimizeToTray: boolean; runOnStartup: boolean }> => ipcRenderer.invoke("bg:set", p),
    quit: (): Promise<void> => ipcRenderer.invoke("bg:quit"),
  },

  tracking: {
    get: (): Promise<{ prefs: { enabled: boolean }; current: { app: string; title: string; tab?: string; browser?: string; start: number } | null }> =>
      ipcRenderer.invoke("tracking:get"),
    set: (p: Partial<{ enabled: boolean }>): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke("tracking:set", p),
    report: (sinceMs?: number): Promise<{ sessions: { app: string; title: string; tab?: string; browser?: string; start: number; end: number; durationMs: number }[] }> =>
      ipcRenderer.invoke("tracking:report", { sinceMs }),
    clear: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("tracking:clear"),
    onTick: (fn: (msg: { enabled: boolean; current: { app: string; title: string; tab?: string; browser?: string; start: number } | null }) => void): (() => void) => {
      const wrapped = (_e: unknown, msg: { enabled: boolean; current: { app: string; title: string; tab?: string; browser?: string; start: number } | null }) => fn(msg);
      ipcRenderer.on("tracking:tick", wrapped as (e: unknown, m: unknown) => void);
      return () => ipcRenderer.removeListener("tracking:tick", wrapped as (e: unknown, m: unknown) => void);
    },
  },

  sys: {
    pulse: (): Promise<{ cpuPct: number; memPct: number; memFreeGb: number; diskFreeGb: number; diskTotalGb: number }> => ipcRenderer.invoke("sys:pulse"),
  },

  downloads: {
    list: (): Promise<Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>> =>
      ipcRenderer.invoke("downloads:list"),
    clear: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:clear"),
    remove: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:remove", id),
    open: (p: string): Promise<string> => ipcRenderer.invoke("downloads:open", p),
    reveal: (p: string): Promise<{ ok: boolean }> => ipcRenderer.invoke("downloads:reveal", p),
    onUpdated: (cb: (arr: Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>) => void) => {
      const fn = (_e: unknown, arr: Array<{ id: string; filename: string; path: string; url: string; bytes: number; state: string; ts: number }>) => cb(arr);
      ipcRenderer.on("downloads:updated", fn);
      return () => ipcRenderer.removeListener("downloads:updated", fn);
    },
  },
};

contextBridge.exposeInMainWorld("hub", api);

export type HubApi = typeof api;
