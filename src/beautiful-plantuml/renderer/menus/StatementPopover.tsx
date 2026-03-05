import type { ReactNode } from "react";
import { C } from "../../theme";
import { MessageIcon, AltIcon, LoopIcon, GroupIcon, DividerIcon, CommentIcon } from "../../icons";
import { useDiagram } from "../../DiagramContext";

const STATEMENT_KINDS: Array<{ kind: string, label: string, icon: ReactNode }> = [
  { kind: "MESSAGE", label: "Message", icon: <MessageIcon width={14} height={14} /> },
  { kind: "ALT", label: "Alt / Else", icon: <AltIcon width={14} height={14} /> },
  { kind: "LOOP", label: "Loop", icon: <LoopIcon width={14} height={14} /> },
  { kind: "GROUP", label: "Group", icon: <GroupIcon width={14} height={14} /> },
  { kind: "DIVIDER", label: "Divider", icon: <DividerIcon width={14} height={14} /> },
  { kind: "NOTE_LEFT", label: "Note Left", icon: <CommentIcon width={14} height={14} /> },
];

interface StatementPopoverProps {
  x: number;
  y: number;
  afterId: string | null;
  onClose: () => void;
  hoverLinesHide: () => void;
}

export function StatementPopover({ x, y, afterId, onClose, hoverLinesHide }: StatementPopoverProps) {
  const { actions } = useDiagram();

  return (
    <div
      style={{
        position: "fixed", left: x, top: y + 16,
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 9999,
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 2,
        minWidth: 160,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, fontWeight: "bold", padding: "4px 8px", color: C.text, textAlign: "center", borderBottom: `1px solid ${C.border}`, marginBottom: 2 }}>
        Insert Statement
      </div>
      {STATEMENT_KINDS.map(({ kind, label, icon }) => (
        <button
          key={kind}
          style={{
            background: "transparent", border: "none", color: C.text,
            fontSize: 12, padding: "7px 10px", textAlign: "left",
            cursor: "pointer", borderRadius: 4,
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          onClick={() => {
            actions.insertStatementAt(afterId, kind as any);
            onClose();
            hoverLinesHide();
          }}
        >
          <span style={{ fontSize: 14, display: "flex", alignItems: "center" }}>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
