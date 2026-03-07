import { useState, useEffect, useCallback, useRef } from "react";
import { ZoomPanContainer } from "../components/ZoomPanContainer";
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
  type DiagramAST,
} from "../beautiful-plantuml";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "plantuml-playground-code";

const DEFAULT_CODE = `@startuml
participant "Frontend" as Alice
participant "Backend" as Bob
participant "Database" as db

Alice -> Bob : POST /api/login
Bob -> db : SELECT user WHERE email = ?
db --> Bob : user record
alt credentials valid
  Bob --> Alice : 200 OK { token }
  note right of Bob : Sign JWT here
  Alice -> Bob : GET /api/profile
  note left of Alice
    Authorization: Bearer <token>
  end note
  Bob --> Alice : 200 OK { profile }
else invalid password
  Bob --> Alice : 401 Unauthorized
  note across : Log the failed attempt
else account locked
  group Lockout handler
    Bob -> db : UPDATE user SET locked = true
    loop 3 times
      Bob -> Alice : Retry-After header
    end
  end
  Bob --> Alice : 403 Forbidden
end
@enduml`;

// ── ErrorPanel ────────────────────────────────────────────────────────────────

function ErrorPanel({ errors }: { errors: { line: number; text: string }[] }) {
  if (errors.length === 0) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: 200,
      overflowY: "auto",
      background: "#160a0a",
      borderTop: "1px solid #3d1a1a",
      zIndex: 10,
    }}>
      <div style={{
        padding: "6px 12px",
        fontSize: 10,
        fontWeight: 700,
        color: "#f85149",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderBottom: "1px solid #3d1a1a",
        background: "#1c0d0d",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {errors.length} Parse Error{errors.length > 1 ? "s" : ""}
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{
          padding: "5px 12px",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: "#ffa198",
          borderBottom: "1px solid #2d1111",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
        }}>
          <span style={{ color: "#f85149", minWidth: 32, fontWeight: 600 }}>
            L{e.line}
          </span>
          <span style={{ color: "#ffa198", opacity: 0.85 }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Playground ────────────────────────────────────────────────────────────────

export default function AppDemo() {
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_CODE;
    } catch {
      return DEFAULT_CODE;
    }
  });

  const [ast, setAst] = useState<DiagramAST | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced localStorage save
  const handleChange = useCallback((newCode: string, newAst: DiagramAST | null) => {
    setCode(newCode);
    setAst(newAst);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, newCode); } catch { /* ignore */ }
    }, 500);
  }, []);

  // Sync ast on direct textarea edits (before DiagramProvider re-parses)
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, newCode); } catch { /* ignore */ }
    }, 500);
  }, []);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const errors = ast?.errors ?? [];

  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#0d1117",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>

      {/* ── Left Panel: Editor ──────────────────────────────────────────── */}
      <div style={{
        width: 350,
        minWidth: 350,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #21262d",
        background: "#161b22",
        position: "relative",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid #21262d",
          background: "#0d1117",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>PlantUML Editor</span>
          <span style={{
            marginLeft: "auto",
            fontSize: 9,
            color: "#3fb950",
            background: "#0d2818",
            border: "1px solid #1e4620",
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}>LIVE</span>
        </div>

        {/* Textarea */}
        <textarea
          value={code}
          onChange={handleTextareaChange}
          spellCheck={false}
          style={{
            flex: 1,
            resize: "none",
            background: "#0d1117",
            color: "#cdd9e5",
            border: "none",
            outline: "none",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 12,
            lineHeight: 1.8,
            padding: "14px 16px",
            overflowY: "auto",
            // Reserve space for error panel
            paddingBottom: errors.length > 0 ? 210 : 14,
          }}
        />

        {/* Error panel — fixed at bottom of left panel */}
        <ErrorPanel errors={errors} />
      </div>

      {/* ── Right Panel: Diagram Playground ────────────────────────────── */}
      <div style={{
        flex: 1,
        height: "100vh",
        position: "relative",
        background: "#0d1117",
        overflow: "hidden",
      }}>
        <DiagramProvider
          code={code}
          onChange={handleChange}
          theme={"zinc-dark" as any}
        >
          <ZoomPanContainer>
            <SequenceDiagram
              enableHoverLayer={true}
              enableDragLayer={true}
            />
          </ZoomPanContainer>

          {/* Context menus */}
          <ParticipantMenuBar />
          <MessageMenuBar />
          <AltMenuBar />
          <GroupMenuBar />
          <LoopMenuBar />
          <DividerMenuBar />
          <NoteMenuBar />

          {/* Insert toolbar + drag */}
          <DiagramActions />
        </DiagramProvider>
      </div>
    </div>
  );
}