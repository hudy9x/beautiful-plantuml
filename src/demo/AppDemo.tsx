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
import { THEMES } from "../beautiful-plantuml/theme";
import { DepdokBanner } from "../components/DepdokBanner";
import "./demo.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "plantuml-playground-code";
const THEME_KEY = "plantuml-playground-theme";

type ThemeName = keyof typeof THEMES;

const THEME_BASES = [
  "default", "zinc", "nord", "catppuccin",
  "tokyo", "dracula", "github", "solarized",
] as const;
type ThemeBase = typeof THEME_BASES[number];
type ThemeMode = "light" | "dark";

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

// ── PNG Export ────────────────────────────────────────────────────────────────

async function downloadAsPng(themeName: ThemeName) {
  const svg = document.querySelector("svg.sequence-diagram") as SVGSVGElement | null;
  if (!svg) return;

  const PAD = 32;
  const svgW = svg.viewBox.baseVal.width || svg.clientWidth;
  const svgH = svg.viewBox.baseVal.height || svg.clientHeight;
  const bgColor = THEMES[themeName]["--c-bg"] ?? "#ffffff";

  // Inline all CSS variables as concrete values inside a clone
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(svgW + PAD * 2));
  clone.setAttribute("height", String(svgH + PAD * 2));

  // Replace every var(--c-*) with its resolved value from the current theme
  const themeVars = THEMES[themeName] as Record<string, string>;
  const inlineVars = (el: Element) => {
    const attrs = ["fill", "stroke", "color", "stop-color"];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val?.startsWith("var(--")) {
        const key = val.slice(4, -1) as keyof typeof themeVars;
        if (themeVars[key]) el.setAttribute(attr, themeVars[key]);
      }
    });
    // Also handle inline styles
    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
      const replaced = styleAttr.replace(/var\(--c-[^)]+\)/g, match => {
        const key = match.slice(4, -1) as keyof typeof themeVars;
        return themeVars[key] ?? match;
      });
      el.setAttribute("style", replaced);
    }
    Array.from(el.children).forEach(inlineVars);
  };
  inlineVars(clone);

  // Shift all content right+down by PAD via a wrapper <g>
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wrapper.setAttribute("transform", `translate(${PAD}, ${PAD})`);
  while (clone.firstChild) wrapper.appendChild(clone.firstChild);

  // Background rect
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(svgW + PAD * 2));
  bg.setAttribute("height", String(svgH + PAD * 2));
  bg.setAttribute("fill", bgColor);
  clone.appendChild(bg);
  clone.appendChild(wrapper);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const W = svgW + PAD * 2;
    const H = svgH + PAD * 2;
    // Scale up to 2× for crispness, but cap total pixels at ~32 MP to stay within browser limits
    const MAX_PIXELS = 32_000_000;
    const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (W * H)));
    canvas.width = Math.floor(W * scale);
    canvas.height = Math.floor(H * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(pngBlob => {
      if (!pngBlob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pngBlob);
      a.download = "diagram.png";
      a.click();
    }, "image/png");
  };
  img.src = url;
}

// ── SVG Export ────────────────────────────────────────────────────────────────

function downloadAsSvg(themeName: ThemeName) {
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

  // Inline all CSS vars
  const themeVars = THEMES[themeName] as Record<string, string>;
  const inlineVars = (el: Element) => {
    ["fill", "stroke", "color", "stop-color"].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val?.startsWith("var(--")) {
        const key = val.slice(4, -1);
        if (themeVars[key]) el.setAttribute(attr, themeVars[key]);
      }
    });
    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
      el.setAttribute("style", styleAttr.replace(/var\(--c-[^)]+\)/g, m => {
        const key = m.slice(4, -1); return themeVars[key] ?? m;
      }));
    }
    Array.from(el.children).forEach(inlineVars);
  };
  inlineVars(clone);

  // Wrap content in a padded <g>, prepend a background rect
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wrapper.setAttribute("transform", `translate(${PAD}, ${PAD})`);
  while (clone.firstChild) wrapper.appendChild(clone.firstChild);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", String(svgW + PAD * 2));
  bg.setAttribute("height", String(svgH + PAD * 2));
  bg.setAttribute("fill", bgColor);
  clone.appendChild(bg);
  clone.appendChild(wrapper);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "diagram.svg";
  a.click();
}

function ToolbarBtn({
  onClick, title, children, accent = false,
}: { onClick: () => void; title: string; children: React.ReactNode; accent?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px",
        border: `1px solid ${accent ? "#1e4620" : "#30363d"}`,
        borderRadius: 6,
        background: accent
          ? (hover ? "#1a4a1f" : "#0d2818")
          : (hover ? "#1c2128" : "#161b22"),
        color: accent ? "#3fb950" : "#cdd9e5",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "inherit",
        fontWeight: 500,
        transition: "background 0.12s, border-color 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Toolbar({
  themeBase, mode, onThemeBase, onMode, onDownload, onExportSvg,
}: {
  themeBase: ThemeBase;
  mode: ThemeMode;
  onThemeBase: (b: ThemeBase) => void;
  onMode: (m: ThemeMode) => void;
  onDownload: () => void;
  onExportSvg: () => void;
}) {
  return (
    <div style={{
      flexShrink: 0,
      height: 44,
      borderBottom: "1px solid #21262d",
      background: "#0d1117",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 14px",
      zIndex: 10,
    }}>
      {/* Theme base selector */}
      <select
        value={themeBase}
        onChange={e => onThemeBase(e.target.value as ThemeBase)}
        style={{
          background: "#161b22",
          color: "#cdd9e5",
          border: "1px solid #30363d",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 11,
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {THEME_BASES.map(b => (
          <option key={b} value={b}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </option>
        ))}
      </select>

      {/* Light / Dark mode toggle */}
      <div
        style={{
          display: "flex",
          border: "1px solid #30363d",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {(["light", "dark"] as ThemeMode[]).map(m => (
          <button
            key={m}
            onClick={() => onMode(m)}
            title={`${m} mode`}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontFamily: "inherit",
              border: "none",
              cursor: "pointer",
              fontWeight: mode === m ? 700 : 400,
              background: mode === m ? "#30363d" : "#161b22",
              color: mode === m ? "#e6edf3" : "#768390",
              transition: "background 0.12s",
            }}
          >
            {m === "light" ? "☀" : "☾"} {m}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export SVG — lossless, any size */}
      <ToolbarBtn onClick={onExportSvg} title="Export as SVG (lossless, any size)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        Export SVG
      </ToolbarBtn>

      {/* Download PNG */}
      <ToolbarBtn onClick={onDownload} title="Download diagram as PNG" accent>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PNG
      </ToolbarBtn>
    </div>
  );
}

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
          fontFamily: "inherit",
          color: "#ffa198",
          borderBottom: "1px solid #2d1111",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
        }}>
          <span style={{ color: "#f85149", minWidth: 32, fontWeight: 600 }}>L{e.line}</span>
          <span style={{ opacity: 0.85 }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Playground ────────────────────────────────────────────────────────────────

export default function AppDemo() {
  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY) || "zinc-dark"; } catch { return "zinc-dark"; }
  })();
  const [themeBase, setThemeBase] = useState<ThemeBase>(() => {
    const base = savedTheme.split("-")[0] as ThemeBase;
    return THEME_BASES.includes(base) ? base : "zinc";
  });
  const [mode, setMode] = useState<ThemeMode>(() =>
    savedTheme.endsWith("-light") ? "light" : "dark"
  );

  const themeName = `${themeBase}-${mode}` as ThemeName;

  // Persist theme preference
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, themeName); } catch { /* ignore */ }
  }, [themeName]);

  const [code, setCode] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_CODE; } catch { return DEFAULT_CODE; }
  });

  const [ast, setAst] = useState<DiagramAST | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Jump to a specific line number in the textarea (1-indexed)
  const handleJump = useCallback((line: number) => {
    console.log('line', line)
    const el = textareaRef.current;
    if (!el) return;
    // Compute approximate scroll position: line height is fontSize * lineHeight
    const lineHeight = 12 * 1.8; // fontSize=12, lineHeight=1.8
    const targetScrollTop = (line - 1) * lineHeight;
    el.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    el.focus();
  }, []);

  const handleChange = useCallback((newCode: string, newAst: DiagramAST | null) => {
    setCode(newCode);
    setAst(newAst);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, newCode); } catch { /* ignore */ }
    }, 500);
  }, []);

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

  // Right panel bg tracks the diagram theme's --c-bg
  const rightBg = (THEMES[themeName] as Record<string, string>)["--c-bg"] ?? "#0d1117";

  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#0d1117",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      position: "fixed",
      top: 0,
      left: 0,
    }}>

      {/* ── Left Panel: Editor ──────────────────────────────────────────── */}
      <div style={{
        width: 350,
        minWidth: 350,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #21262d",
        background: "#161b22",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0,
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

        <textarea
          ref={textareaRef}
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
            fontFamily: "inherit",
            fontSize: 12,
            lineHeight: 1.8,
            padding: "14px 16px",
            overflowY: "auto",
            boxSizing: "border-box",
            // Add substantial bottom padding so code can scroll up past the floating banner + error panel
            paddingBottom: errors.length > 0 ? 400 : 260,
          }}
        />
        <ErrorPanel errors={errors} />

        {/* Advertisement Banner */}
        <DepdokBanner />
      </div>

      {/* ── Right Panel: Toolbar + Diagram ─────────────────────────────── */}
      <div style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <Toolbar
          themeBase={themeBase}
          mode={mode}
          onThemeBase={setThemeBase}
          onMode={setMode}
          onDownload={() => downloadAsPng(themeName)}
          onExportSvg={() => downloadAsSvg(themeName)}
        />

        {/* Diagram area */}
        <div style={{ flex: 1, position: "relative", background: rightBg, overflow: "hidden", transition: "background 0.2s" }}>
          <DiagramProvider
            code={code}
            onChange={handleChange}
            theme={themeName as any}
            onJump={handleJump}
          >
            <ZoomPanContainer>
              <SequenceDiagram
                enableHoverLayer={true}
                enableDragLayer={true}
              />
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