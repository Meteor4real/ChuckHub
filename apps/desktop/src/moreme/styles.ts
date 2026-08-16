// MoreMe theme tokens. One fixed palette — Papatui: The Rock's brand, warm
// Polynesian earth. Papatui has never published an official hex/design-
// system guide (confirmed — papatui.com itself isn't reachable from this
// build environment's network, so the site's own CSS can't be pulled
// directly either), so this is a judgment call, not an extraction. It's
// built from the one consistent signal across independent coverage of the
// actual packaging (Global Cosmetic Industry, retail listings, press):
// "earthy... olive, tan, and brown... minimalist, rustic, masculine."
// Earlier passes leaned almost entirely on a single teal/mint accent —
// this version pulls the olive and bronze/copper tones the real packaging
// is described as actually having, instead of one narrow accent family.
// No theme switching, no decorative hero-image backdrop (it read as clutter
// behind the Today text) — just this one look, everywhere.

export type Palette = {
  bg: string; elev: string; sunk: string;
  ink: string; inkSoft: string; inkTiny: string; line: string;
  mint: string; mintDeep: string; mintHi: string;  // primary accent family (olive-teal)
  warn: string; cool: string;                       // rust-clay, bronze/copper
};

const PAPATUI_PALETTE: Palette = {
  bg: "#1B1712", elev: "#26201A", sunk: "#100D0A",
  ink: "#F3EBDB", inkSoft: "#C9B99E", inkTiny: "#8F7B5C", line: "#3D3323",
  mint: "#5C7A4A", mintDeep: "#405838", mintHi: "#8AAE6E",
  warn: "#B2532E", cool: "#B8862F",
};

// The token object every component imports.
export const T: Palette = { ...PAPATUI_PALETTE };

// Push the palette onto the desktop chrome's CSS vars so the topbar / login
// shell match too. The token names (--red etc.) are legacy aliases; only
// the values matter.
function applyRootVars(p: Palette) {
  const r = document.documentElement.style;
  r.setProperty("--bg", p.bg);
  r.setProperty("--panel", p.elev);
  r.setProperty("--line", p.line);
  r.setProperty("--ink", p.ink);
  r.setProperty("--mute", p.inkSoft);
  r.setProperty("--red", p.mint);
  r.setProperty("--pink", p.mintHi);
  r.setProperty("--orange", p.cool);
  r.setProperty("--glow", p.mint);
}

// Call once on boot so the CSS vars are live before first paint.
export function initTheme() {
  applyRootVars(T);
}

// Class-based MoreMe CSS, rebuilt from the current palette. Called inside the
// embed component and re-run on theme change.
export function buildMMStyle(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
.moreme-embed { background: ${T.bg}; color: ${T.ink}; font-family: "Inter", system-ui, sans-serif; }
.moreme-embed .serif { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; letter-spacing: .01em; }
.moreme-embed .condensed { font-family: "Barlow Condensed", "Inter", sans-serif; text-transform: uppercase; letter-spacing: .04em; }
.moreme-embed .mm-card { background: ${T.elev}; border: 1px solid ${T.line}; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35); }
.moreme-embed .mm-card-mint { background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 14px; box-shadow: 0 0 24px ${T.mint}11 inset, 0 8px 24px rgba(0,0,0,.35); animation: mmGlow 6s ease-in-out infinite; }
@keyframes mmGlow { 0%, 100% { box-shadow: 0 0 24px ${T.mint}11 inset, 0 8px 24px rgba(0,0,0,.35); } 50% { box-shadow: 0 0 30px ${T.mint}22 inset, 0 0 30px ${T.mint}22, 0 8px 24px rgba(0,0,0,.35); } }
@keyframes mmToastIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.moreme-embed .mm-toast-in { animation: mmToastIn .25s ease-out; }
/* The HALOS feel layer: controls physically respond to being pressed, and
   a completed checkbox pops. Guarded by body.reduce-motion. */
.moreme-embed .mm-btn:active:not(:disabled), .moreme-embed .mm-tab:active, .moreme-embed .mm-action:active { transform: translateY(1px); }
@keyframes mmPop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } }
.moreme-embed .mm-donebtn[data-done="true"] { animation: mmPop .22s ease; }
body.reduce-motion .moreme-embed .mm-donebtn[data-done="true"] { animation: none; }
body.reduce-motion .moreme-embed .mm-card-mint { animation: none; }
.moreme-embed .mm-action { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid ${T.line}; border-radius: 10px; background: ${T.sunk}; transition: border-color .15s, background .15s; width: 100%; text-align: left; }
.moreme-embed .mm-action:hover:not(:disabled) { border-color: ${T.mint}; }
.moreme-embed .mm-action.done { opacity: .6; }
.moreme-embed .mm-action.locked { background: ${T.bg}; }
.moreme-embed .mm-tab { font-family: "Inter", sans-serif; font-size: 12px; padding: 5px 14px; border-radius: 999px; border: 1px solid ${T.line}; background: transparent; color: ${T.inkSoft}; cursor: pointer; transition: all .15s; text-transform: capitalize; }
.moreme-embed .mm-tab:hover { color: ${T.ink}; border-color: ${T.mint}; }
.moreme-embed .mm-tab.active { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn { font-family: "Inter", sans-serif; font-size: 12px; padding: 8px 14px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.sunk}; color: ${T.ink}; cursor: pointer; transition: all .15s; }
.moreme-embed .mm-btn:hover { border-color: ${T.mint}; }
.moreme-embed .mm-btn-primary { background: ${T.mint}; border-color: ${T.mint}; color: ${T.bg}; font-weight: 600; }
.moreme-embed .mm-btn-secondary { background: transparent; border-color: ${T.cool}; color: ${T.cool}; }
.moreme-embed .mm-btn-secondary:hover { background: ${T.cool}22; }
.moreme-embed .mm-btn-danger { background: transparent; border-color: ${T.warn}; color: ${T.warn}; }
.moreme-embed .mm-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.moreme-embed input, .moreme-embed select, .moreme-embed textarea { background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 10px; color: ${T.ink}; padding: 8px 10px; font: inherit; outline: none; }
.moreme-embed input:focus, .moreme-embed select:focus, .moreme-embed textarea:focus { border-color: ${T.mint}; }
.moreme-embed .mm-h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; }
.moreme-embed .mm-progress { position: relative; height: 12px; background: ${T.bg}; border: 1px solid ${T.line}; border-radius: 6px; overflow: hidden; }
.moreme-embed .mm-progress-fill { position: absolute; inset: 0; background: linear-gradient(90deg, ${T.mintHi}, ${T.mint}); transition: width .35s ease; }
.moreme-embed .mm-progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${T.inkSoft}; letter-spacing: .04em; mix-blend-mode: luminosity; }
.moreme-embed .mm-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.moreme-embed .mm-dow { text-align: center; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: ${T.inkTiny}; padding-bottom: 4px; }
.moreme-embed .mm-day { position: relative; min-height: 86px; background: ${T.sunk}; border: 1px solid ${T.line}; border-radius: 10px; padding: 6px; cursor: pointer; transition: border-color .12s, background .12s; overflow: hidden; display: flex; flex-direction: column; gap: 3px; }
.moreme-embed .mm-day:hover { border-color: ${T.mint}; }
.moreme-embed .mm-day.other { opacity: .4; }
.moreme-embed .mm-day.today { border-color: ${T.mint}; box-shadow: 0 0 0 1px ${T.mint}, 0 0 16px ${T.mint}33; }
.moreme-embed .mm-day.selected { background: ${T.elev}; border-color: ${T.mintHi}; }
.moreme-embed .mm-daynum { font-size: 12px; font-weight: 700; color: ${T.inkSoft}; }
.moreme-embed .mm-day.today .mm-daynum { color: ${T.mint}; }
.moreme-embed .mm-chip { display: flex; align-items: center; gap: 4px; font-size: 10px; line-height: 1.2; padding: 1px 5px; border-radius: 5px; background: rgba(255,255,255,.04); border-left: 3px solid var(--c, ${T.mint}); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.moreme-embed .mm-chip.done { opacity: .45; text-decoration: line-through; }
.moreme-embed .mm-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c, ${T.mint}); flex: none; }
.moreme-embed .mm-modal-back { position: absolute; inset: 0; background: rgba(0,0,0,.62); display: grid; place-items: center; z-index: 50; padding: 20px; }
.moreme-embed .mm-modal { width: min(560px, 96%); max-height: 92%; overflow: auto; background: ${T.elev}; border: 1px solid ${T.mint}55; border-radius: 16px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.moreme-embed .mm-field { display: flex; flex-direction: column; gap: 5px; }
.moreme-embed .mm-field > label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: ${T.inkTiny}; }
.moreme-embed .mm-row { display: flex; gap: 10px; flex-wrap: wrap; }
.moreme-embed .mm-seg { display: inline-flex; border: 1px solid ${T.line}; border-radius: 8px; overflow: hidden; flex-wrap: wrap; }
.moreme-embed .mm-seg button { background: transparent; border: none; color: ${T.inkSoft}; padding: 6px 10px; font-size: 11px; cursor: pointer; }
.moreme-embed .mm-seg button.on { background: ${T.mint}; color: ${T.bg}; font-weight: 700; }
.moreme-embed .mm-conflict { border-color: ${T.warn} !important; box-shadow: 0 0 0 1px ${T.warn}55; }
.moreme-embed .mm-ach { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid ${T.line}; border-left: 3px solid var(--c, ${T.line}); background: ${T.sunk}; }
.moreme-embed .mm-ach.unlocked { border-color: var(--c, ${T.mint}); background: var(--c, ${T.mint})0d; }
.moreme-embed .mm-medal { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 18px; flex: none; background: ${T.bg}; border: 1px solid ${T.line}; color: ${T.inkTiny}; }
.moreme-embed .mm-ach.unlocked .mm-medal { background: var(--c, ${T.mint}); color: ${T.bg}; border-color: var(--c, ${T.mint}); }
.moreme-embed .scrolly { overflow: auto; }
.moreme-embed .scrolly::-webkit-scrollbar { width: 8px; height: 8px; }
.moreme-embed .scrolly::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }

/* Print: when printing, strip the dark theme to clean black-on-white and hide
   everything except the marked printable region. */
@media print {
  body * { visibility: hidden !important; }
  .mm-print, .mm-print * { visibility: visible !important; }
  .mm-print { position: absolute; inset: 0; background: #fff !important; color: #111 !important; padding: 24px; }
  .mm-print .mm-card, .mm-print .mm-action, .mm-print .mm-day { background: #fff !important; border-color: #ccc !important; box-shadow: none !important; color: #111 !important; }
  .mm-no-print { display: none !important; }
  .mm-print * { color: #111 !important; }
  .mm-print .mm-progress-fill { background: #888 !important; }
}
`;
}

// Back-compat: some modules still import MM_STYLE as a value. Provide the
// initial build; the embed re-renders with buildMMStyle() on theme change.
export const MM_STYLE = buildMMStyle();

export const inp: React.CSSProperties = {
  flex: 1, background: "rgba(0,0,0,0.4)", border: `1px solid ${T.line}`, borderRadius: 10,
  color: T.ink, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%",
};
