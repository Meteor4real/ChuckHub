import { useState } from "react";
import { buildMMStyle } from "../moreme/styles";
import { MoreMeUI } from "../moreme/ui";

// Embedded MoreMe — calendar-first life OS for a Mount Vernon student.
export function MoreMe() {
  const [css] = useState(() => buildMMStyle());
  return (
    <div className="stage moreme-embed" style={{ display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      <MoreMeUI />
    </div>
  );
}
