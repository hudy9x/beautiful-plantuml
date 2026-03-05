import React, { useState } from "react";
import {
  // Core
  DiagramProvider,
  SequenceDiagram,
  // Built-in menus (use some, skip others)
  ParticipantMenuBar,
  GroupMenuBar,
  LoopMenuBar,
  AltMenuBar,
  DividerMenuBar,
  NoteMenuBar,
  // Hooks
  useDiagram,
  useDiagramActions,
  MessageMenuBar,
} from "./browser-based-plantuml-generator";

// ── Custom message menu ───────────────────────────────────────────────────────
// Instead of using the built-in <MessageMenuBar />, we build our own.
function MyMessageMenu() {
  const { selectedNodeId, clickPosition } = useDiagram();
  const actions = useDiagramActions();

  if (!selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:") || selectedNodeId.includes(":")) return null;

  return (
    <div style={{
      position: "fixed",
      left: clickPosition.x,
      top: clickPosition.y - 8,
      background: "#1e1b4b",
      border: "1px solid #6366f1",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
      zIndex: 100,
      minWidth: 180,
      transform: "translate(-50%, -100%)",
    }}>
      <div style={{ fontSize: 11, fontWeight: "bold", color: "#a5b4fc", marginBottom: 8 }}>
        ✉ Message Actions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={() => actions.createMessage(selectedNodeId, "after")}
          style={btnStyle("#6366f1")}
        >
          + Create message below
        </button>
        <button
          onClick={() => actions.deleteNode(selectedNodeId)}
          style={btnStyle("#dc2626")}
        >
          🗑 Delete message
        </button>
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}22`,
    border: `1px solid ${color}`,
    color: "#e2e8f0",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 11,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  };
}

// ── Sample code ───────────────────────────────────────────────────────────────
const SAMPLE = `@startuml
participant Alice
participant Bob
participant Carol

Alice -> Bob: Hello
Bob -> Carol: Forward
group Processing
  Carol -> Carol: Think
  Carol -> Bob: Done
end
Bob -> Alice: Result
@enduml`;

// ── AppDemo ───────────────────────────────────────────────────────────────────
export default function AppDemo() {
  const [code, setCode] = useState(SAMPLE);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1117",
      color: "#cdd9e5",
      fontFamily: "'JetBrains Mono', monospace",
      padding: 24,
    }}>
      <div style={{ fontSize: 13, fontWeight: "bold", color: "#a5b4fc", marginBottom: 16 }}>
        Custom Wiring Demo
      </div>

      {/* DiagramProvider injects the dark theme CSS variables automatically */}
      <DiagramProvider code={code} onChange={(newCode) => setCode(newCode)}>

        {/* Diagram SVG */}
        <SequenceDiagram />

        {/* Custom message menu (replaces built-in MessageMenuBar) */}
        {/* <MyMessageMenu /> */}

        {/* Built-in menus for everything else */}
        <ParticipantMenuBar />
        <AltMenuBar />
        <GroupMenuBar />
        <LoopMenuBar />
        <DividerMenuBar />
        <NoteMenuBar />
        <MessageMenuBar />
        {/* MessageMenuBar intentionally omitted — replaced by MyMessageMenu above */}

      </DiagramProvider>
    </div>
  );
}