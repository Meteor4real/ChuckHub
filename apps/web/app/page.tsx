"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

const OWNER = "Meteor4real";
const REPO = "MoreMeApp"; // repo was renamed; old URL still 301-redirects but the explicit new name is safer
const RELEASES_PAGE = `https://github.com/${OWNER}/${REPO}/releases`;
const ACTIONS_PAGE = `https://github.com/${OWNER}/${REPO}/actions`;

// Artifact names must match apps/desktop/electron-builder.yml. MoreMe is a
// single-user app built for the owner's own Windows machine — the release
// workflow only builds a Windows installer now, so this page only offers
// that (a portable .zip ships from the same build if electron-builder
// produces one, shown as a secondary option below).
const primary = {
  os: "Windows 10/11 · x64",
  file: "MoreMe-Setup.exe",
};
const portable = {
  os: "Windows · portable .zip",
  file: "MoreMe-win-x64.zip",
};

type Asset = { name: string; browser_download_url: string; size: number };
type Release = { tag_name: string; html_url: string; published_at: string; assets: Asset[] };

export default function Page() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Fetch the real latest release from the GitHub API. Only assets that
  // actually exist render as download buttons; missing ones show a
  // "build pending" state instead of a dead /releases/latest/download link.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, { cache: "no-store" });
        if (!r.ok) { setLoadErr(`Release API returned ${r.status}`); return; }
        const j = (await r.json()) as Release;
        if (!cancelled) setRelease(j);
      } catch (e) {
        if (!cancelled) setLoadErr(String(e));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const assets = release?.assets ?? [];
  const findAsset = (file: string) => assets.find((a) => a.name === file);

  const primaryAsset = findAsset(primary.file);
  const portableAsset = findAsset(portable.file);
  const status: "loading" | "pending" | "ready" | "error" =
    loadErr ? "error"
    : !release ? "loading"
    : !primaryAsset ? "pending"
    : "ready";

  function statusBanner() {
    if (status === "loading") {
      return <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs text-chuck-mute">Checking the latest release…</div>;
    }
    if (status === "error") {
      return (
        <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs text-chuck-mute">
          Couldn&apos;t reach GitHub Releases ({loadErr}).{" "}
          <a href={RELEASES_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline">Browse manually</a>.
        </div>
      );
    }
    if (status === "pending") {
      return (
        <div className="mt-6 chuck-panel p-3 text-center font-mono text-xs leading-relaxed">
          <span className="chuck-chip-live mr-2">Build pending</span>
          <span className="text-chuck-ink">
            {release?.tag_name} is published but the installer hasn&apos;t uploaded yet.
          </span>{" "}
          <a href={ACTIONS_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline">
            Check Actions
          </a>
          <span className="text-chuck-mute"> · this page updates automatically once the build attaches.</span>
        </div>
      );
    }
    return null;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-16">
      {/* Hero */}
      <header className="flex flex-col items-center text-center">
        <div className="animate-pulseGlow">
          <Logo size={104} />
        </div>

        <div className="mt-6 chuck-chip-live">◇ Calendar-first life OS</div>

        <h1 className="mt-5 font-mono text-4xl font-black uppercase tracking-[0.18em] text-chuck-ink sm:text-5xl">
          More<span className="chuck-glow-text">Me</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-chuck-mute">
          Davis&apos;s life OS. Local to this machine — no accounts, no cloud.
        </p>

        <div className="mt-8 h-[2px] w-full max-w-sm chuck-strip" />

        {statusBanner()}

        {/* Primary download */}
        <div className="mt-10 w-full max-w-md">
          {primaryAsset ? (
            <a
              href={primaryAsset.browser_download_url}
              download={primary.file}
              rel="noopener"
              className="group block chuck-panel-hot p-5 text-left transition hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="chuck-chip">Windows 10/11</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">
                  .exe installer · {fmtBytes(primaryAsset.size)}
                </span>
              </div>
              <div className="mt-3 chuck-title text-lg">Download for Windows</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.os}</div>
              <div className="mt-1 font-mono text-xs text-chuck-pink">{primary.file}</div>
            </a>
          ) : (
            <div className="chuck-panel p-5 text-left opacity-60">
              <div className="flex items-center justify-between">
                <span className="chuck-chip">Pending</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-chuck-mute">.exe installer</span>
              </div>
              <div className="mt-3 chuck-title text-lg">Windows build not uploaded yet</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.os}</div>
              <div className="mt-1 font-mono text-xs text-chuck-mute">{primary.file} · waiting on CI</div>
            </div>
          )}
        </div>

        {/* Portable option — same Windows build, no installer/admin rights needed */}
        {portableAsset && (
          <div className="mt-3 w-full max-w-md">
            <a
              href={portableAsset.browser_download_url}
              download={portable.file}
              rel="noopener"
              className="block chuck-panel px-3 py-2 text-left transition hover:border-chuck-pink/60"
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-chuck-ink">{portable.os}</div>
              <div className="font-mono text-[10px] text-chuck-mute">{portable.file} · {fmtBytes(portableAsset.size)}</div>
            </a>
          </div>
        )}

        <p className="mt-6 max-w-md text-xs leading-relaxed text-chuck-mute">
          MoreMe is a single-user app, built for the owner's own Windows
          machine — the installer above is the only supported download.
        </p>
        <p className="mt-2 text-xs text-chuck-mute">
          No download yet?{" "}
          <a href={RELEASES_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline-offset-2 hover:underline">
            See all releases on GitHub
          </a>{" "}
          or{" "}
          <a href={ACTIONS_PAGE} target="_blank" rel="noopener" className="chuck-glow-text underline-offset-2 hover:underline">
            check the build pipeline
          </a>
          .
        </p>
      </header>

      <footer className="mt-16 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-widest text-chuck-mute">
        <span>MoreMe{release ? ` · ${release.tag_name}` : ""}</span>
        <span className="text-chuck-line">·</span>
        <a
          href={`https://github.com/${OWNER}/${REPO}`}
          className="transition hover:text-chuck-pink"
        >
          Source
        </a>
      </footer>
    </main>
  );
}

function fmtBytes(n: number): string {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
