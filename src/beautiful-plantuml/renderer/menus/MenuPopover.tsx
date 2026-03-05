import React from "react";
import { createPortal } from "react-dom";
import { C } from "../../theme";

interface MenuPopoverProps {
  position: { x: number; y: number };
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function MenuPopover({ position, title, subtitle, children }: MenuPopoverProps) {
  return createPortal(
    <div style={{
      position: "fixed", left: position.x, top: position.y - 8,
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 100,
      width: 200, transform: "translate(-50%, -100%)",
    }}>
      <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: C.text, textAlign: "center" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 12, wordBreak: "break-all", textAlign: "center" }}>
          {subtitle}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
