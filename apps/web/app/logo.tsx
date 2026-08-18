// MoreMe wordmark — sun + mountain peaks + barbell on the DP (Dude Perfect)
// black tile. Same mark and palette as apps/desktop/build/icon.svg and the
// in-app MoreMeMark (moreme/ui.tsx), so the download page and the
// installed app actually match.
export function Logo({ size = 104 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      role="img"
      aria-label="MoreMe"
      style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(62,219,181,0.45))" }}
    >
      <rect width="192" height="192" rx="36" fill="#0F1318" />
      <circle cx="96" cy="46" r="12" fill="#33B5FF" />
      <path d="M18 156 L60 72 L96 126 L132 72 L174 156" fill="none" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 174 L126 174" fill="none" stroke="#3EDBB5" strokeWidth={9} strokeLinecap="round" />
      <circle cx="60" cy="174" r="9" fill="#3EDBB5" />
      <circle cx="132" cy="174" r="9" fill="#3EDBB5" />
    </svg>
  );
}
