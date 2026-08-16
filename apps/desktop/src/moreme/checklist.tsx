// MoreMe — shared checklist editor. Used by Projects (milestones) and
// Companies (roadmap steps) — same shape, same interaction.

import { useState } from "react";
import { T } from "./styles";
import { uid } from "./store";
import type { ChecklistItem } from "./types";

export function ChecklistEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (i: ChecklistItem[]) => void }) {
  const [v, setV] = useState("");
  const add = () => { if (v.trim()) { onChange([...items, { id: uid(), text: v.trim(), done: false }]); setV(""); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={it.done} onChange={() => onChange(items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))} style={{ width: "auto" }} />
          <span style={{ flex: 1, fontSize: 13, textDecoration: it.done ? "line-through" : "none", color: it.done ? T.inkTiny : T.ink }}>{it.text}</span>
          <button className="mm-btn" style={{ padding: "2px 8px" }} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Add a step…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="mm-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}
