import React, { useState, useEffect } from 'react'
import './App.css'

import { SAMPLES } from './samples'
import { DiagramProvider } from './browser-based-plantuml-generator/DiagramContext'
import { DiagramActions } from './browser-based-plantuml-generator/DiagramActions'
import { C, THEMES } from './browser-based-plantuml-generator/theme'
import { PARTICIPANT_KINDS, type DiagramAST } from './browser-based-plantuml-generator/types'
import { ParticipantShape, SequenceDiagram } from './PlantumlParser'
import { parse } from './browser-based-plantuml-generator/parser/parser'

function Header() {
  return (
    <div style={{ marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 17, color: C.accent }}>PlantUML Sequence Viewer</h1>
        <span style={{
          fontSize: 10, color: C.muted, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px"
        }}>
          SVG · dynamic column width · lifeline touch · notes · dividers · alt · group · loop · box
        </span>
      </div>
    </div>
  );
}

function ShapeLegend() {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "8px 16px", marginBottom: 14, overflowX: "auto"
    }}>
      <svg height={90} width={PARTICIPANT_KINDS.length * 130}
        style={{ fontFamily: "'JetBrains Mono',monospace", display: "block" }}>
        {PARTICIPANT_KINDS.map((k, i) => (
          <ParticipantShape key={k} kind={k}
            name={k === "participant" ? "Participant" : k.charAt(0).toUpperCase() + k.slice(1)}
            cx={65 + i * 130} cy={46} stroke={C.accent} />
        ))}
      </svg>
    </div>
  );
}

function EditorPanel({
  input,
  setInput,
  error,
  astErrors
}: {
  input: string;
  setInput: (value: string) => void;
  error: string | null;
  astErrors?: { line: number, text: string }[];
}) {
  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        {SAMPLES.map(({ label, code }) => (
          <button key={label} onClick={() => setInput(code)}
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.text, borderRadius: 5, padding: "3px 9px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit"
            }}>{label}</button>
        ))}
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} spellCheck={false}
        style={{
          width: "100%", height: 440, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
          fontFamily: "inherit", fontSize: 12, lineHeight: 1.7,
          padding: 14, resize: "vertical", outline: "none", boxSizing: "border-box"
        }} />
      {error && <div style={{
        marginTop: 8, background: "#2d1515", border: "1px solid #f47067",
        borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067"
      }}>⚠ {error}</div>}
      {astErrors && astErrors.length > 0 && (
        <div style={{
          marginTop: 8, background: "#2d1515", border: "1px solid #f47067",
          borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067",
          maxHeight: 150, overflowY: "auto"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 6 }}>⚠ Unsupported Syntax:</div>
          {astErrors.map((e, i) => (
            <div key={i} style={{ fontFamily: "monospace", marginTop: 2 }}>
              Line {e.line}: <span style={{ opacity: 0.8 }}>{e.text.trim()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewPanel({
  ast,
  tab,
  setTab,
  diagramTheme,
  setDiagramTheme
}: {
  ast: DiagramAST | null;
  tab: "diagram" | "ast";
  setTab: (t: "diagram" | "ast") => void;
  diagramTheme: "dark" | "light";
  setDiagramTheme: (t: "dark" | "light") => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["diagram", "ast"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: tab === t ? C.accent : C.surface, color: tab === t ? C.bg : C.muted,
                border: `1px solid ${tab === t ? C.accent : C.border}`, borderRadius: 6,
                padding: "4px 14px", fontSize: 10, cursor: "pointer",
                fontWeight: tab === t ? "bold" : "normal",
                textTransform: "uppercase", letterSpacing: 1, fontFamily: "inherit"
              }}>{t}</button>
          ))}
        </div>

        <button onClick={() => setDiagramTheme(diagramTheme === "dark" ? "light" : "dark")}
          style={{
            background: C.surface, color: C.text,
            border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "4px 14px", fontSize: 10, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 1, fontFamily: "inherit",
            fontWeight: "bold"
          }}>
          {diagramTheme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{
          ...(THEMES[diagramTheme] as React.CSSProperties),
          background: C.bg, border: `1px solid ${C.border}`, color: C.text,
          borderRadius: 8, padding: 16, minHeight: 500, overflowX: "auto"
        }}>
          {ast && tab === "diagram" && <SequenceDiagram ast={ast} />}
          {ast && tab === "ast" && <pre style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{JSON.stringify(ast, null, 2)}</pre>}
        </div>

        {ast && <DiagramActions />}
      </div>

      <div style={{
        marginTop: 8, display: "flex", gap: 14, fontSize: 10, color: C.muted,
        borderTop: `1px solid ${C.border}`, paddingTop: 8, flexWrap: "wrap"
      }}>
        {[{ c: C.arrow, l: "message" }, { c: C.altLabel, l: "alt/else" }, { c: C.groupLabel, l: "group" },
        { c: C.loopLabel, l: "loop" }, { c: C.noteBorder, l: "note" }, { c: C.dividerLine, l: "divider" }
        ].map(({ c, l }) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [input, setInput] = useState(SAMPLES[5].code);
  const [ast, setAst] = useState<DiagramAST | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"diagram" | "ast">("diagram");
  const [diagramTheme, setDiagramTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try { setAst(parse(input)); setError(null); }
    catch (e) { setError((e as Error).message); setAst(null); }
  }, [input]);

  return (
    <DiagramProvider code={input} updateCode={setInput} ast={ast}>
      <div style={{
        ...(THEMES.dark as React.CSSProperties),
        minHeight: "100vh", background: C.bg, color: C.text,
        fontFamily: "'JetBrains Mono','Fira Code',monospace", padding: 20, boxSizing: "border-box"
      }}>
        <Header />

        <ShapeLegend />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
          <EditorPanel
            input={input}
            setInput={setInput}
            error={error}
            astErrors={ast?.errors}
          />

          <PreviewPanel
            ast={ast}
            tab={tab}
            setTab={setTab}
            diagramTheme={diagramTheme}
            setDiagramTheme={setDiagramTheme}
          />
        </div>
      </div>
    </DiagramProvider>
  );
}

export default App;
