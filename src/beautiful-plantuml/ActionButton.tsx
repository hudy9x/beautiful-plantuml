import React from "react";
import { C } from "./theme";

export function ActionButton({ onClick, label, danger, icon }: { onClick: () => void, label: string, danger?: boolean, icon?: React.ReactNode }) {
  const bg = danger ? "#4f1616" : "rgba(255,255,255,0.05)";
  const color = danger ? "#fca5a5" : C.text;
  const border = danger ? "#7f1d1d" : C.border;
  return (
    <button onClick={onClick} title={label}
      style={{
        background: bg, color: color, border: `1px solid ${border}`,
        padding: icon ? "6px" : "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11,
        textAlign: "center",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
        minWidth: icon ? "26px" : undefined
      }}>
      {icon ? <span style={{ display: "flex", alignItems: "center" }}>{icon}</span> : label}
    </button>
  );
}
