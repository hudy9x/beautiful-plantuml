import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "./theme";

export interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ isOpen, title, defaultValue, onSave, onCancel }: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        width: 300,
        maxWidth: "90%",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>
        <div style={{ fontSize: 16, fontWeight: "bold", color: C.text }}>
          {title}
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(value);
            if (e.key === "Escape") onCancel();
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            background: C.surface,
            color: C.text,
            outline: "none",
            fontSize: 14,
            fontFamily: "inherit"
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "none",
              background: C.accent,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
