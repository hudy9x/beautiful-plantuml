import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// ── PlantUML StreamLanguage ───────────────────────────────────────────────────
const plantumlLang = StreamLanguage.define({
  name: "plantuml",
  startState: () => ({}),
  token(stream) {
    if (stream.eatSpace()) return null;

    // Single-quote comment
    if (stream.match(/^'/)) { stream.skipToEnd(); return "comment"; }

    // Block-level keywords
    if (stream.match(/^@(startuml|enduml)\b/)) return "meta";

    // Control flow keywords
    if (stream.match(/^(alt|else|end note|end|loop|group|opt|break|critical|ref|activate|deactivate|destroy|create|return|autonumber)\b/)) return "keyword";

    // Entity keywords
    if (stream.match(/^(participant|actor|boundary|control|entity|database|collections|queue|note|rnote|hnote|over|across|skinparam|title|header|footer|divider|separator)\b/)) return "keyword";

    // "as" alias keyword
    if (stream.match(/^\bas\b/)) return "keyword";

    // Arrows
    if (stream.match(/^(->>|-->|->|<<--|<--|<-|[ox]?-+[ox]?-*>?)/)) return "operator";

    // Quoted string
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol()) { if (stream.next() === '"') break; }
      return "string";
    }

    // HTML-like markup tags
    if (stream.match(/^<[^>]+>/)) return "atom";

    // Colon separator
    if (stream.peek() === ':') { stream.next(); return "punctuation"; }

    // Identifiers
    if (stream.match(/^[A-Za-z_][\w]*/)) return "variableName";

    // Numbers
    if (stream.match(/^\d+/)) return "number";

    stream.next();
    return null;
  },
  tokenTable: {
    comment:      t.comment,
    meta:         t.meta,
    keyword:      t.keyword,
    operator:     t.operator,
    string:       t.string,
    atom:         t.atom,
    punctuation:  t.punctuation,
    variableName: t.variableName,
    number:       t.number,
  },
});

// ── Dark highlight style (GitHub dark palette) ───────────────────────────────
const wiredHighlight = HighlightStyle.define([
  { tag: t.comment,      color: "#8b949e", fontStyle: "italic" },
  { tag: t.meta,         color: "#e6edf3", fontWeight: "700" },
  { tag: t.keyword,      color: "#ff7b72", fontWeight: "700" },
  { tag: t.operator,     color: "#79c0ff", fontWeight: "600" },
  { tag: t.string,       color: "#a5d6ff" },
  { tag: t.atom,         color: "#8b949e" },
  { tag: t.punctuation,  color: "#8b949e" },
  { tag: t.variableName, color: "#cdd9e5" },
  { tag: t.number,       color: "#f2cc60", fontWeight: "600" },
]);

// ── CodeMirror dark theme (GitHub dark, no shadows, square) ──────────────────
const wiredTheme = EditorView.theme({
  "&": {
    height: "100%",
    background: "#0d1117",
    color: "#e6edf3",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
  },
  ".cm-scroller":  { overflow: "auto", lineHeight: "1.75" },
  ".cm-scroller::-webkit-scrollbar":              { width: "8px", height: "8px" },
  ".cm-scroller::-webkit-scrollbar-track":        { background: "#0d1117" },
  ".cm-scroller::-webkit-scrollbar-corner":       { background: "#0d1117" },
  ".cm-scroller::-webkit-scrollbar-thumb":        { background: "#30363d", borderRadius: "0", border: "2px solid #0d1117" },
  ".cm-scroller::-webkit-scrollbar-thumb:hover":  { background: "#484f58" },
  ".cm-scroller::-webkit-scrollbar-thumb:active": { background: "#6e7681" },
  ".cm-content":   { padding: "14px 16px", caretColor: "#e6edf3", textAlign: "left" },
  ".cm-line":      { padding: "0", textAlign: "left" },
  ".cm-cursor":    { borderLeftColor: "#e6edf3", borderLeftWidth: "2px" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    background: "#264f78 !important",
  },
  ".cm-gutters": {
    background: "#161b22",
    color: "#6e7681",
    border: "none",
    borderRight: "1px solid #21262d",
    minWidth: "44px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 4px",
    fontSize: "11px",
    textAlign: "right",
  },
  ".cm-activeLine":       { background: "#161b22" },
  ".cm-activeLineGutter": { background: "#1c2128" },
  "&.cm-focused":         { outline: "none" },
  ".cm-matchingBracket":  { background: "#3d5a80", outline: "1px solid #58a6ff" },
}, { dark: true });

// ── Public API ────────────────────────────────────────────────────────────────
export interface CodeEditorRef {
  scrollToLine: (line: number) => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ value, onChange }, ref) => {
  const hostRef   = useRef<HTMLDivElement>(null);
  const viewRef   = useRef<EditorView | null>(null);
  const cbRef     = useRef(onChange);
  cbRef.current   = onChange;

  useImperativeHandle(ref, () => ({
    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
      const pos = view.state.doc.line(clamped).from;
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" })
      });
      view.focus();
    },
  }));

  // Mount editor once
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          plantumlLang,
          syntaxHighlighting(wiredHighlight),
          wiredTheme,
          EditorView.updateListener.of(u => {
            if (u.docChanged) cbRef.current(u.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value from outside (e.g. load from localStorage)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== value) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} style={{ height: "100%", overflow: "hidden" }} />;
});

CodeEditor.displayName = "CodeEditor";
export default CodeEditor;
