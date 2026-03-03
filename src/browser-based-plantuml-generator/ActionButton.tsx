import React from "react";
import { C } from "../PlantumlParser";

export function ActionButton({ onClick, label, danger }: { onClick: () => void, label: string, danger?: boolean }) {
  const bg = danger ? "#4f1616" : "rgba(255,255,255,0.05)";
  const color = danger ? "#fca5a5" : C.text;
  const border = danger ? "#7f1d1d" : C.border;
  return (
    <button onClick={onClick}
      style={{
        background: bg, color: color, border: `1px solid ${border}`,
        padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11,
        textAlign: "center"
      }}>
      {label}
    </button>
  );
}
