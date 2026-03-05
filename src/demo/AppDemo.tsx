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
} from "../beautiful-plantuml";
import { ThemeSwitcher, type ThemeBase, type ThemeMode } from "../components/ThemeSwitcher";

// ── Samples ───────────────────────────────────────────────────────────────────

const SAMPLES: {
  title: string;
  description: string;
  plantUml: string;
  usageCode: string;
  menus: boolean;
  actions: boolean;
  enableHoverLayer?: boolean;
  enableDragLayer?: boolean;
}[] = [
    {
      title: "1. Minimal — Read Only",
      description: "Just render. No hover layer, no drag layer.",
      plantUml: `@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi!
@enduml`,
      usageCode: `<DiagramProvider code={code} onChange={setCode}>
  <SequenceDiagram
    enableHoverLayer={false}
    enableDragLayer={false}
  />
</DiagramProvider>`,
      menus: false,
      actions: false,
      enableHoverLayer: false,
      enableDragLayer: false,
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
      description: "All menus + crosshair insert toolbar + drag-to-reroute arrows.",
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

function DemoCard({ title, description, plantUml, usageCode, menus, actions, enableHoverLayer = true, enableDragLayer = true, theme, mode }: {
  title: string;
  description: string;
  plantUml: string;
  usageCode: string;
  menus: boolean;
  actions: boolean;
  enableHoverLayer?: boolean;
  enableDragLayer?: boolean;
  theme?: ThemeBase;
  mode?: ThemeMode;
}) {
  const [code] = useState(plantUml);
  const fullTheme = theme && mode ? `${theme}-${mode}` as any : 'zinc-dark';

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
      <div style={{ padding: 20, overflowX: "auto", position: "relative", background: "var(--c-bg)" }}>
        <DiagramProvider code={code} onChange={() => { }} theme={fullTheme}>
          <SequenceDiagram
            enableHoverLayer={enableHoverLayer}
            enableDragLayer={enableDragLayer}
          />
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
  const [theme, setTheme] = useState<ThemeBase>('zinc');
  const [mode, setMode] = useState<ThemeMode>('dark');

  const bgColors: Record<ThemeBase, Record<ThemeMode, string>> = {
    default: { light: "#ffffff", dark: "#0d1117" },
    zinc: { light: "#ffffff", dark: "#09090b" },
    nord: { light: "#eceff4", dark: "#2e3440" },
    catppuccin: { light: "#eff1f5", dark: "#1e1e2e" },
    tokyo: { light: "#d5d6db", dark: "#1a1b26" },
    dracula: { light: "#f8f8f2", dark: "#282a36" },
    github: { light: "#ffffff", dark: "#0d1117" },
    solarized: { light: "#fdf6e3", dark: "#002b36" },
  };
  const textColors: Record<ThemeBase, Record<ThemeMode, string>> = {
    default: { light: "#24292f", dark: "#cdd9e5" },
    zinc: { light: "#09090b", dark: "#fafafa" },
    nord: { light: "#2e3440", dark: "#eceff4" },
    catppuccin: { light: "#4c4f69", dark: "#cdd6f4" },
    tokyo: { light: "#343b58", dark: "#c0caf5" },
    dracula: { light: "#282a36", dark: "#f8f8f2" },
    github: { light: "#24292f", dark: "#cdd9e5" },
    solarized: { light: "#657b83", dark: "#839496" },
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bgColors[theme][mode],
      color: textColors[theme][mode],
      fontFamily: "'JetBrains Mono', monospace",
      padding: "28px 32px",
    }}>
      <ThemeSwitcher theme={theme} mode={mode} onChangeTheme={setTheme} onChangeMode={setMode} />

      <div style={{ marginBottom: 28, marginTop: 40 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: "#e6edf3" }}>
          PlantUML Sequence Diagram
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#768390" }}>
          Usage examples — from minimal to full-featured.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {SAMPLES.map(s => (
          <DemoCard key={s.title} {...s} theme={theme} mode={mode} />
        ))}
      </div>
    </div>
  );
}