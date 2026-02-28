import { useState, useEffect } from "react";
import { SequenceDiagram, parse, type DiagramAST, PARTICIPANT_KINDS } from "./plantuml-renderer";
import { ParticipantShape } from "./plantuml-renderer/renderer/ParticipantShape";
import { C } from "./plantuml-renderer/theme";

// ─────────────────────────────────────────────────────────────────────────────
// samples/index.ts
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLES: { label: string; code: string }[] = [
  { label: "box", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  participant Alice\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> Other : hello\n\n@enduml` },
  { label: "box nested", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  box "Subteam" #LightGray\n    participant Alice\n    participant John\n  end box\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> John : hello\nJohn -> Other: Hello\n\n@enduml` },
  { label: "notes bare", code: `@startuml\nAlice->Bob : hello\nnote left: this is a first note\n\nBob->Alice : ok\nnote right: this is another note\n\nJame->Bob : I am thinking\nnote left\na note\ncan also be defined\non several lines\nend note\n@enduml` },
  { label: "notes full", code: `@startuml\nparticipant Alice\nparticipant Bob\n\nnote left of Alice #aqua\nThis is displayed\nleft of Alice.\nend note\n\nnote right of Alice: This is displayed right of Alice.\nnote over Alice: This is displayed over Alice.\nnote over Alice, Bob #FFAAAA: This is displayed over Bob and Alice.\nnote across: This note spans ALL participants!\n\nAlice -> Bob: Hello\nBob --> Alice: Hi back\n@enduml` },
  { label: "dividers", code: `@startuml\n\n== Initialization ==\n\nAlice -> Bob: Authentication Request\nBob --> Alice: Authentication Response\n\n== Repetition ==\n\nAlice -> Bob: Another authentication Request\nAlice <-- Bob: another authentication Response\n\n@enduml` },
  { label: "combined", code: `@startuml\nactor User as U\nparticipant App as A\ndatabase Cache as C\ndatabase DB as D\n\n== Authentication ==\n\nnote over U, A: User initiates login flow\n\nU -> A : Login Request\n\nalt cache hit\n    A -> C : Check session\n    C -> A : Session found\n    A -> U : Welcome back!\nelse cache miss\n    A -> DB : Verify credentials\n    DB -> A : User valid\n    A -> U : Login successful\nend\n\ngroup Sync\n    loop every 5 seconds\n        A -> DB : Poll\n        DB -> A : Data\n    end\nend\n\nnote across #lightblue: All done\n\n@enduml` },
  { label: "all types", code: `@startuml\nparticipant Participant as Foo\nactor Actor as Foo1\nboundary Boundary as Foo2\ncontrol Control as Foo3\nentity Entity as Foo4\ndatabase Database as Foo5\ncollections Collections as Foo6\nqueue Queue as Foo7\n\nFoo -> Foo1 : To actor\nFoo -> Foo2 : To boundary\nFoo -> Foo3 : To control\nFoo -> Foo4 : To entity\nFoo -> Foo5 : To database\nFoo -> Foo6 : To collections\nFoo -> Foo7 : To queue\n@enduml` },
  { label: "alt/else", code: `@startuml\nactor Alice as A\nparticipant Server as S\ndatabase DB as D\n\nA -> S : Authentication Request\n\nalt success\n    S -> D : Query user\n    D -> S : User found\n    S -> A : Authentication Accepted\nelse failure\n    S -> A : Authentication Failure\n    alt retry\n        A -> S : Retry login\n        S -> A : Please repeat\n    else give up\n        A -> S : Cancel\n    end\nend\n@enduml` },
];

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function PlantumlParser() {
  const [input, setInput] = useState(SAMPLES[0].code);
  const [ast, setAst] = useState<DiagramAST | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"diagram" | "ast">("diagram");

  useEffect(() => {
    try { setAst(parse(input)); setError(null); }
    catch (e) { setError((e as Error).message); setAst(null); }
  }, [input]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono','Fira Code',monospace", padding: 20, boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 18, color: C.accent }}>PlantUML Sequence Viewer</h1>
          <span style={{ fontSize: 10, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px" }}>
            notes · dividers · alt · group · loop · box · all participant types
          </span>
        </div>
      </div>

      {/* Shape legend */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", marginBottom: 18, alignItems: "flex-end" }}>
        {PARTICIPANT_KINDS.map((k: typeof PARTICIPANT_KINDS[number]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <ParticipantShape kind={k} name={k === "participant" ? "Participant" : k.charAt(0).toUpperCase() + k.slice(1)} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        {/* Editor */}
        <div>
          <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {SAMPLES.map(({ label, code }) => (
              <button key={label} onClick={() => setInput(code)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} spellCheck={false}
            style={{ width: "100%", height: 400, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: "inherit", fontSize: 12, lineHeight: 1.7, padding: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          {error && <div style={{ marginTop: 8, background: "#2d1515", border: "1px solid #f47067", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067" }}>⚠ {error}</div>}
        </div>

        {/* Output */}
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["diagram", "ast"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? C.accent : C.surface, color: tab === t ? C.bg : C.muted, border: `1px solid ${tab === t ? C.accent : C.border}`, borderRadius: 6, padding: "4px 14px", fontSize: 10, cursor: "pointer", fontWeight: tab === t ? "bold" : "normal", textTransform: "uppercase", letterSpacing: 1, fontFamily: "inherit" }}>{t}</button>
            ))}
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, minHeight: 500, overflowX: "auto" }}>
            {tab === "diagram" && <SequenceDiagram code={input} />}
            {ast && tab === "ast" && <pre style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{JSON.stringify(ast, null, 2)}</pre>}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8, flexWrap: "wrap" }}>
            {[{ c: C.arrow, l: "→ arrow" }, { c: C.altLabel, l: "alt" }, { c: C.groupLabel, l: "group" }, { c: C.loopLabel, l: "loop" }, { c: C.noteBorder, l: "note" }, { c: C.dividerLine, l: "divider" }].map(({ c, l }) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}