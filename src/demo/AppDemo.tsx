import { useState } from "react";
import {
  DiagramProvider,
  SequenceDiagram,
  DiagramActions,
  ParticipantMenuBar,
  GroupMenuBar,
  LoopMenuBar,
  AltMenuBar,
  DividerMenuBar,
  NoteMenuBar,
  MessageMenuBar,
} from "../browser-based-plantuml-generator";

// ── Samples ───────────────────────────────────────────────────────────────────

const SAMPLES: {
  title: string;
  description: string;
  plantUml: string;
  usageCode: string;
  menus: boolean;
  actions: boolean;
}[] = [
    {
      title: "1. Minimal",
      description: "Just render — no interaction needed.",
      plantUml: `@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi!
@enduml`,
      usageCode: `const [code, setCode] = useState(\`
  @startuml
  Alice -> Bob: Hello
  Bob -> Alice: Hi!
  @enduml
\`);

<DiagramProvider code={code} onChange={setCode}>
  <SequenceDiagram />
</DiagramProvider>`,
      menus: false,
      actions: false,
    },
    {
      title: "2. With Context Menus",
      description: "Click any element to edit via context menus.",
      plantUml: `@startuml
participant Alice
participant Bob

Alice -> Bob: Request
Bob -> Alice: Response
@enduml`,
      usageCode: `<DiagramProvider code={code} onChange={setCode}>
  <SequenceDiagram />

  <ParticipantMenuBar />
  <MessageMenuBar />
  <AltMenuBar />
  <GroupMenuBar />
  <LoopMenuBar />
  <DividerMenuBar />
  <NoteMenuBar />
</DiagramProvider>`,
      menus: true,
      actions: false,
    },
    {
      title: "3. Full Featured",
      description: "All menus + insert toolbar + drag-to-reroute arrows.",
      plantUml: `@startuml
participant Alice
participant Bob
participant Carol

Alice -> Bob: Hello
Bob -> Carol: Forward
group Processing
  Carol -> Carol: Think
  alt success
    Carol -> Bob: Done
  else error
    Carol -> Bob: Failed
  end
end
note right of Bob: Result ready
Bob -> Alice: Result
@enduml`,
      usageCode: `<DiagramProvider code={code} onChange={setCode}>
  <SequenceDiagram />

  <ParticipantMenuBar />
  <MessageMenuBar />
  <AltMenuBar />
  <GroupMenuBar />
  <LoopMenuBar />
  <DividerMenuBar />
  <NoteMenuBar />

  {/* All-in-one toolbar: insert + drag */}
  <DiagramActions />
</DiagramProvider>`,
      menus: true,
      actions: true,
    },
  ];

// ── DemoCard ──────────────────────────────────────────────────────────────────

function DemoCard({ title, description, plantUml, usageCode, menus, actions }: {
  title: string;
  description: string;
  plantUml: string;
  usageCode: string;
  menus: boolean;
  actions: boolean;
}) {
  const [code] = useState(plantUml);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "380px 1fr",
      border: "1px solid #21262d",
      borderRadius: 10,
      overflow: "hidden",
      background: "#161b22",
    }}>
      {/* Left: usage code */}
      <div style={{
        borderRight: "1px solid #21262d",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid #21262d",
          background: "#0d1117",
        }}>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#79c0ff" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#768390", marginTop: 3 }}>{description}</div>
        </div>
        <pre style={{
          margin: 0,
          flex: 1,
          background: "#0d1117",
          color: "#cdd9e5",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          lineHeight: 1.75,
          padding: "14px 16px",
          overflowX: "auto",
          whiteSpace: "pre",
          textAlign: "left",
        }}>
          {usageCode}
        </pre>
      </div>

      {/* Right: live diagram */}
      <div style={{ padding: 20, overflowX: "auto", position: "relative" }}>
        <DiagramProvider code={code} onChange={() => { }}>
          <SequenceDiagram />
          {menus && (
            <>
              <ParticipantMenuBar />
              <MessageMenuBar />
              <AltMenuBar />
              <GroupMenuBar />
              <LoopMenuBar />
              <DividerMenuBar />
              <NoteMenuBar />
            </>
          )}
          {actions && <DiagramActions />}
        </DiagramProvider>
      </div>
    </div>
  );
}

// ── AppDemo ───────────────────────────────────────────────────────────────────

export default function AppDemo() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1117",
      color: "#cdd9e5",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "28px 32px",
    }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: "#e6edf3" }}>
          PlantUML Sequence Diagram
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#768390" }}>
          Usage examples — from minimal to full-featured.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {SAMPLES.map(s => (
          <DemoCard key={s.title} {...s} />
        ))}
      </div>
    </div>
  );
}