import { useState, useEffect, useCallback, useRef } from "react";
import { ZoomPanContainer } from "../beautiful-plantuml";
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
import { THEMES } from "../beautiful-plantuml/theme";
import { DepdokBanner } from "../components/DepdokBanner";
import CodeEditor, { type CodeEditorRef } from "./CodeEditor";
import "./demo.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "plantuml-playground-code";
const THEME_KEY = "plantuml-playground-theme";
const PANEL_W_KEY = "plantuml-panel-width";

type ThemeName = keyof typeof THEMES;
const THEME_BASES = ["default", "zinc", "nord", "catppuccin", "tokyo", "dracula", "github", "solarized"] as const;
type ThemeBase = typeof THEME_BASES[number];
type ThemeMode = "light" | "dark";

const DEFAULT_CODE = `@startuml
participant "Frontend\\n""**App**""" as Alice
participant "Backend" as Bob
participant "Database" as db

Alice -> Bob : <font color="red">POST</font> /api/login
Bob -> db : SELECT user WHERE email = ?
|||
db --> Bob : user record
||45||
alt credentials valid
  Bob --> Alice : 200 OK { token }
  note right of Bob : Sign **JWT** here
  Alice -> Bob : GET /api/profile
  note left of Alice
    Authorization: Bearer <token>
    --
    <font color="#3fb950">~~waved~~</font> and __underlined__
    Also --stroked-- or //italics//
  end note
  Bob --> Alice : 200 OK { profile }
else invalid password
  Bob --> Alice : 401 Unauthorized
  note across : Log the failed attempt
else account locked
  group Lockout handler
    Bob -> db : UPDATE user SET locked = true
    loop
      Bob -> Alice : Retry-After header
    end
  end
  Bob --> Alice : 403 Forbidden
end
@enduml`;

// ── PNG Export ────────────────────────────────────────────────────────────────

async function downloadAsPng(themeName: ThemeName) {
  const svg = document.querySelector("svg.sequence-diagram") as SVGSVGElement | null;
  if (!svg) return;
  const PAD = 32;
  const svgW = svg.viewBox.baseVal.width || svg.clientWidth;
  const svgH = svg.viewBox.baseVal.height || svg.clientHeight;
  const bgColor = (THEMES[themeName] as Record<string, string>)["--c-bg"] ?? "#ffffff";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(svgW + PAD * 2));
  clone.setAttribute("height", String(svgH + PAD * 2));
  const themeVars = THEMES[themeName] as Record<string, string>;
  const inlineVars = (el: Element) => {
    ["fill", "stroke", "color", "stop-color"].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val?.startsWith("var(--")) {
        const key = val.slice(4, -1);
        if (themeVars[key]) el.setAttribute(attr, themeVars[key]);
      }
    });
    const s = el.getAttribute("style");
    if (s) el.setAttribute("style", s.replace(/var\(--c-[^)]+\)/g, m => themeVars[m.slice(4, -1)] ?? m));
    Array.from(el.children).forEach(inlineVars);
  };
  inlineVars(clone);
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wrapper.setAttribute("transform", `translate(${PAD},${PAD})`);
  while (clone.firstChild) wrapper.appendChild(clone.firstChild);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(svgW + PAD * 2)); bg.setAttribute("height", String(svgH + PAD * 2));
  bg.setAttribute("fill", bgColor);
  clone.appendChild(bg); clone.appendChild(wrapper);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const W = svgW + PAD * 2, H = svgH + PAD * 2;
    const scale = Math.min(2, Math.sqrt(32_000_000 / (W * H)));
    canvas.width = Math.floor(W * scale); canvas.height = Math.floor(H * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "diagram.png"; a.click();
    }, "image/png");
  };
  img.src = url;
}

function downloadAsSvg(themeName: ThemeName) {
  const svg = document.querySelector("svg.sequence-diagram") as SVGSVGElement | null;
  if (!svg) return;
  const PAD = 32;
  const svgW = svg.viewBox.baseVal.width || svg.clientWidth;
  const svgH = svg.viewBox.baseVal.height || svg.clientHeight;
  const bgColor = (THEMES[themeName] as Record<string, string>)["--c-bg"] ?? "#ffffff";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(svgW + PAD * 2)); clone.setAttribute("height", String(svgH + PAD * 2));
  const themeVars = THEMES[themeName] as Record<string, string>;
  const inlineVars = (el: Element) => {
    ["fill", "stroke", "color", "stop-color"].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val?.startsWith("var(--")) { const k = val.slice(4, -1); if (themeVars[k]) el.setAttribute(attr, themeVars[k]); }
    });
    const s = el.getAttribute("style");
    if (s) el.setAttribute("style", s.replace(/var\(--c-[^)]+\)/g, m => themeVars[m.slice(4, -1)] ?? m));
    Array.from(el.children).forEach(inlineVars);
  };
  inlineVars(clone);
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wrapper.setAttribute("transform", `translate(${PAD},${PAD})`);
  while (clone.firstChild) wrapper.appendChild(clone.firstChild);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(svgW + PAD * 2)); bg.setAttribute("height", String(svgH + PAD * 2));
  bg.setAttribute("fill", bgColor);
  clone.appendChild(bg); clone.appendChild(wrapper);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
  a.download = "diagram.svg"; a.click();
}

// ── ErrorPanel ────────────────────────────────────────────────────────────────

function ErrorPanel({ errors }: { errors: { line: number; text: string }[] }) {
  if (errors.length === 0) return null;
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: 160,
      overflowY: "auto", background: "#fff8f8",
      borderTop: "2px solid #000000", zIndex: 10,
    }}>
      <div style={{
        padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#000000",
        letterSpacing: "1.1px", textTransform: "uppercase",
        borderBottom: "1px solid #e2e8f0", background: "#f5f5f5",
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'JetBrains Mono','Courier New',monospace",
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {errors.length} Parse Error{errors.length > 1 ? "s" : ""}
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{
          padding: "5px 14px", fontSize: 11, color: "#1a1a1a",
          borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "baseline",
          fontFamily: "'JetBrains Mono','Courier New',monospace",
        }}>
          <span style={{ color: "#000000", minWidth: 32, fontWeight: 700 }}>L{e.line}</span>
          <span style={{ color: "#757575" }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  themeBase, mode, onThemeBase, onMode, onDownload, onExportSvg, editorVisible, onToggleEditor,
}: {
  themeBase: ThemeBase; mode: ThemeMode;
  onThemeBase: (b: ThemeBase) => void; onMode: (m: ThemeMode) => void;
  onDownload: () => void; onExportSvg: () => void;
  editorVisible: boolean; onToggleEditor: () => void;
}) {
  // WIRED top utility bar: full-bleed black, WiredMono caps
  return (
    <div style={{
      flexShrink: 0, height: 40,
      background: "#000000",
      display: "flex", alignItems: "center", gap: 0,
      padding: "0 16px", zIndex: 10,
      borderBottom: "none",
      fontFamily: "'JetBrains Mono','Courier New',monospace",
    }}>
      {/* Logo / brand */}
      <span style={{
        fontSize: 11, fontWeight: 700, color: "#ffffff",
        letterSpacing: "1.2px", textTransform: "uppercase",
        marginRight: 20, whiteSpace: "nowrap",
      }}>
        PlantUML
      </span>

      {/* Hairline divider */}
      <span style={{ width: 1, height: 20, background: "#333333", marginRight: 16 }} />

      {/* Toggle editor */}
      <button
        onClick={onToggleEditor}
        title={editorVisible ? "Hide editor" : "Show editor"}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", border: "1px solid #444444",
          borderRadius: 0, background: "transparent", color: "#ffffff",
          cursor: "pointer", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.8px", textTransform: "uppercase",
          fontFamily: "inherit", transition: "background 0.12s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#222222")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {editorVisible
          ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="18" /><line x1="14" y1="3" x2="14" y2="21" /></svg>Hide</>
          : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="18" /><line x1="14" y1="3" x2="14" y2="21" /></svg>Editor</>
        }
      </button>

      <span style={{ width: 1, height: 20, background: "#333333", margin: "0 12px" }} />

      {/* Theme select */}
      <select
        value={themeBase}
        onChange={e => onThemeBase(e.target.value as ThemeBase)}
        style={{
          background: "transparent", color: "#ffffff",
          border: "1px solid #444444", borderRadius: 0,
          padding: "3px 6px", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.8px", textTransform: "uppercase",
          fontFamily: "inherit", cursor: "pointer", outline: "none",
        }}
      >
        {THEME_BASES.map(b => (
          <option key={b} value={b} style={{ background: "#111111" }}>
            {b.toUpperCase()}
          </option>
        ))}
      </select>

      <span style={{ width: 1, height: 20, background: "#333333", margin: "0 12px" }} />

      {/* Light / Dark toggle */}
      <div style={{ display: "flex", border: "1px solid #444444" }}>
        {(["light", "dark"] as ThemeMode[]).map(m => (
          <button
            key={m}
            onClick={() => onMode(m)}
            style={{
              padding: "4px 10px", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.8px", textTransform: "uppercase",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: mode === m ? "#ffffff" : "transparent",
              color: mode === m ? "#000000" : "#888888",
              transition: "background 0.12s",
            }}
          >
            {m === "light" ? "☀ Light" : "☾ Dark"}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export SVG */}
      <button
        onClick={onExportSvg}
        title="Export as SVG"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 12px", border: "1px solid #444444",
          borderRadius: 0, background: "transparent", color: "#ffffff",
          cursor: "pointer", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.8px", textTransform: "uppercase",
          fontFamily: "inherit", transition: "background 0.12s",
          marginRight: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#222222")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        SVG
      </button>

      {/* Download PNG */}
      <button
        onClick={onDownload}
        title="Download as PNG"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 12px",
          border: "2px solid #ffffff",
          borderRadius: 0, background: "#ffffff", color: "#000000",
          cursor: "pointer", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.8px", textTransform: "uppercase",
          fontFamily: "inherit", transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#000000"; e.currentTarget.style.color = "#ffffff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = "#000000"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        PNG
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function AppDemo() {
  const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY) || "zinc-dark"; } catch { return "zinc-dark"; } })();
  const [themeBase, setThemeBase] = useState<ThemeBase>(() => {
    const b = savedTheme.split("-")[0] as ThemeBase;
    return THEME_BASES.includes(b) ? b : "zinc";
  });
  const [mode, setMode] = useState<ThemeMode>(() => savedTheme.endsWith("-light") ? "light" : "dark");
  const themeName = `${themeBase}-${mode}` as ThemeName;

  useEffect(() => { try { localStorage.setItem(THEME_KEY, themeName); } catch { /* ignore */ } }, [themeName]);

  const [code, setCode] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_CODE; } catch { return DEFAULT_CODE; }
  });
  const [ast, setAst] = useState<DiagramAST | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<CodeEditorRef>(null);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(PANEL_W_KEY) || "380"); } catch { return 380; }
  });
  const [editorVisible, setEditorVisible] = useState(true);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const handleJump = useCallback((line: number) => {
    editorRef.current?.scrollToLine(line);
  }, []);

  const handleChange = useCallback((newCode: string, newAst: DiagramAST | null) => {
    setCode(newCode);
    setAst(newAst);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, newCode); } catch { /* ignore */ }
    }, 500);
  }, []);

  const handleEditorChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, newCode); } catch { /* ignore */ }
    }, 500);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ── Drag-to-resize ──────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      const newW = Math.max(200, Math.min(800, dragStartW.current + delta));
      setPanelWidth(newW);
      try { localStorage.setItem(PANEL_W_KEY, String(newW)); } catch { /* ignore */ }
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  const errors = ast?.errors ?? [];
  const rightBg = (THEMES[themeName] as Record<string, string>)["--c-bg"] ?? "#0d1117";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100vw", height: "100vh", overflow: "hidden",
      background: "#000000",
      fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
      position: "fixed", top: 0, left: 0,
    }}>
      {/* ── Global toolbar (WIRED black utility bar) */}
      <Toolbar
        themeBase={themeBase} mode={mode}
        onThemeBase={setThemeBase} onMode={setMode}
        onDownload={() => downloadAsPng(themeName)}
        onExportSvg={() => downloadAsSvg(themeName)}
        editorVisible={editorVisible}
        onToggleEditor={() => setEditorVisible(v => !v)}
      />

      {/* ── Main content row */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Banner floats over editor panel without being clipped */}
        {editorVisible && <DepdokBanner />}

        {/* ── Left panel: Editor (WIRED paper-white) */}
        {editorVisible && (
          <div style={{
            width: panelWidth,
            minWidth: panelWidth,
            maxWidth: panelWidth,
            height: "100%",
            display: "flex", flexDirection: "column",
            borderRight: "2px solid #000000",
            background: "#0d1117",
            position: "relative", overflow: "hidden",
            flexShrink: 0,
          }}>
            {/* Editor header ribbon */}
            <div style={{
              flexShrink: 0, padding: "10px 16px",
              borderBottom: "1px solid #21262d",
              background: "#161b22",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {/* Eyebrow kicker — WiredMono ALL-CAPS */}
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#8b949e",
                letterSpacing: "1.1px", textTransform: "uppercase",
                fontFamily: "'JetBrains Mono','Courier New',monospace",
              }}>
                PlantUML Editor
              </span>
              {/* LIVE badge */}
              <span style={{
                marginLeft: "auto",
                fontSize: 9,
                background: "#000000", color: "#ffffff",
                padding: "2px 6px", fontWeight: 700,
                letterSpacing: "0.9px", textTransform: "uppercase",
                fontFamily: "'JetBrains Mono','Courier New',monospace",
                borderRadius: 0,
              }}>Live</span>
            </div>

            {/* CodeMirror editor */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <CodeEditor
                ref={editorRef}
                value={code}
                onChange={handleEditorChange}
              />
              <ErrorPanel errors={errors} />
            </div>

          </div>
        )}

        {/* ── Drag handle */}
        {editorVisible && (
          <div
            onMouseDown={onDragStart}
            style={{
              width: 4, cursor: "col-resize",
              background: "transparent",
              flexShrink: 0, zIndex: 20,
              borderRight: "1px solid #4e4e4eff",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#057dbc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            title="Drag to resize editor"
          />
        )}

        {/* ── Right panel: Diagram */}
        <div style={{
          flex: 1, height: "100%", display: "flex",
          flexDirection: "column", overflow: "hidden",
          background: rightBg, transition: "background 0.2s",
        }}>
          <DiagramProvider
            code={code}
            onChange={handleChange}
            theme={themeName as any}
            onJump={handleJump}
          >
            <ZoomPanContainer>
              <SequenceDiagram enableHoverLayer={true} enableDragLayer={true} />
            </ZoomPanContainer>
            <ParticipantMenuBar />
            <MessageMenuBar />
            <AltMenuBar />
            <GroupMenuBar />
            <LoopMenuBar />
            <DividerMenuBar />
            <NoteMenuBar />
            <DiagramActions />
          </DiagramProvider>
        </div>
      </div>
    </div>
  );
}