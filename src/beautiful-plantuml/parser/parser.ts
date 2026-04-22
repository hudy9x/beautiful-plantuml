import type { AltBlockNode, AltBranch, BoxDeclNode, DiagramAST, GroupBlockNode, LoopBlockNode, MessageNode, Participant, ParticipantKind, StatementNode, Token } from "../types";
import { genId } from "../utils";
import { tokenizeLine } from "./tokenizer";

export function parse(input: string): DiagramAST {
  const tokens: (Token & { lineNo: number; raw: string })[] = [];
  input.split("\n").forEach((line, i) => {
    const t = tokenizeLine(line);
    if (t !== null) tokens.push({ ...t, lineNo: i + 1, raw: line });
  });
  let pos = 0, msgIdx = 0, autoNumInt = 1, autoNumPrefix = "";
  let isAutoNumOn = false;
  let title: string | null = null;
  const hasAutonumber = tokens.some(t => t.type === "AUTONUMBER");
  const declMap: Record<string, Participant> = {};
  const participantOrder: Participant[] = [];
  const participantSet = new Set<string>();
  const errors: { line: number; text: string }[] = [];

  function reg(alias: string, name: string, kind: ParticipantKind, stereoType?: string, color?: string) {
    if (participantSet.has(alias)) return;
    const p: Participant = { alias, name, kind, stereoType, color };
    participantSet.add(alias); participantOrder.push(p); declMap[alias] = p;
  }
  function ensure(alias: string) { reg(alias, alias, "participant"); }

  function collectNoteLines(): string[] {
    const lines: string[] = [];
    while (pos < tokens.length && tokens[pos].type !== "END_NOTE") {
      const tok = tokens[pos++]; 
      if (tok.type === "TEXT_LINE") lines.push(tok.text);
      else if (tok.type === "EMPTY_LINE") lines.push("");
    }
    if (pos < tokens.length) pos++;
    return lines;
  }

  const STOP = new Set(["END", "ELSE", "END_BLOCK", "END_BOX"]);

  function parseStmts(ref: { current: MessageNode | null }): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (STOP.has(tok.type)) break;
      switch (tok.type) {
        case "BOX": { pos++; stmts.push(parseBox(tok.title, tok.color, ref)); break; }
        case "DECLARATION": { reg(tok.alias, tok.name, tok.kind, tok.stereoType, tok.color); pos++; break; }
        case "NOTE_INLINE": { const ln = (tok as any).lineNo; pos++; stmts.push({ type: "NOTE", id: genId(), lineNo: ln, position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_START": { const ln = (tok as any).lineNo; pos++; stmts.push({ type: "NOTE", id: genId(), lineNo: ln, position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: collectNoteLines() }); break; }
        case "NOTE_BARE_INLINE": { const ln = (tok as any).lineNo; pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", id: genId(), lineNo: ln, position: tok.position, p1, p2: null, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_BARE_START": { const ln = (tok as any).lineNo; pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", id: genId(), lineNo: ln, position: tok.position, p1, p2: null, color: tok.color, lines: collectNoteLines() }); break; }
        case "DIVIDER": { stmts.push({ type: "DIVIDER", id: genId(), lineNo: (tok as any).lineNo, label: tok.label }); pos++; break; }
        case "ALT": { const ln = (tok as any).lineNo; const c = tok.condition; pos++; stmts.push({ ...parseAlt(c, ref), lineNo: ln }); break; }
        case "GROUP": { const ln = (tok as any).lineNo; const l = tok.label; pos++; stmts.push({ ...parseGroup(l, ref), lineNo: ln }); break; }
        case "LOOP": { const ln = (tok as any).lineNo; const l = tok.label; pos++; stmts.push({ ...parseLoop(l, ref), lineNo: ln }); break; }
        case "TITLE": { title = tok.text; pos++; break; }
        case "AUTONUMBER": { 
          isAutoNumOn = true; 
          const startVal = (tok as any).start;
          if (startVal && startVal.includes(".")) {
             const parts = startVal.split(".");
             const last = parts.pop() || "1";
             autoNumPrefix = parts.length > 0 ? parts.join(".") + "." : "";
             autoNumInt = parseInt(last, 10) || 1;
          } else {
             autoNumPrefix = "";
             autoNumInt = startVal ? parseInt(startVal, 10) || 1 : 1;
          }
          pos++; break; 
        }
        case "MESSAGE": {
          msgIdx++; ensure(tok.from); ensure(tok.to);
          const fi = participantOrder.findIndex(p => p.alias === tok.from);
          const ti = participantOrder.findIndex(p => p.alias === tok.to);
          
          let currentAutoNum: string | number | null = null;
          if (isAutoNumOn) {
            currentAutoNum = autoNumPrefix ? `${autoNumPrefix}${autoNumInt}` : autoNumInt;
            autoNumInt++;
          }
          
          const msg: MessageNode = {
            type: "MESSAGE", id: genId(), lineNo: (tok as any).lineNo, from: tok.from, arrow: tok.arrow, to: tok.to, label: tok.label, idx: msgIdx, autoNum: currentAutoNum,
            leftAlias: fi <= ti ? tok.from : tok.to, rightAlias: fi <= ti ? tok.to : tok.from
          };
          ref.current = msg; stmts.push(msg); pos++; break;
        }
        default: {
          if (tok.type === "TEXT_LINE") {
            errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
          }
          pos++;
        }
      }
    }
    return stmts;
  }

  function parseAlt(cond: string, ref: { current: MessageNode | null }): AltBlockNode {
    const branches: AltBranch[] = [{ condition: cond, statements: parseStmts(ref) }];
    while (pos < tokens.length && tokens[pos].type === "ELSE") {
      const c = (tokens[pos] as { type: "ELSE"; condition: string }).condition; pos++;
      branches.push({ condition: c, statements: parseStmts(ref) });
    }
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "ALT_BLOCK", id: genId(), branches };
  }
  function parseGroup(label: string, ref: { current: MessageNode | null }): GroupBlockNode {
    const s = parseStmts(ref); if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "GROUP_BLOCK", id: genId(), label, statements: s };
  }
  function parseLoop(label: string, ref: { current: MessageNode | null }): LoopBlockNode {
    const s = parseStmts(ref); if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "LOOP_BLOCK", id: genId(), label, statements: s };
  }
  function parseBox(title: string | null, color: string | null, ref: { current: MessageNode | null }): BoxDeclNode {
    const direct: string[] = [], children: BoxDeclNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === "END_BOX" || tok.type === "END") { pos++; break; }
      if (tok.type === "BOX") { pos++; children.push(parseBox(tok.title, tok.color, ref)); }
      else if (tok.type === "DECLARATION") { reg(tok.alias, tok.name, tok.kind, tok.stereoType, tok.color); direct.push(tok.alias); pos++; }
      else {
        if (tok.type === "TEXT_LINE") {
          errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
        }
        pos++;
      }
    }
    return {
      type: "BOX_DECL", id: genId(), title, color, directAliases: direct, children,
      allAliases: [...direct, ...children.flatMap(c => c.allAliases)]
    };
  }

  const ref = { current: null as MessageNode | null };
  const all = parseStmts(ref);
  while (pos < tokens.length) {
    const tok = tokens[pos];
    if (tok.type === "TEXT_LINE") {
      errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
    }
    pos++;
  }

  return {
    title, autonumber: hasAutonumber, participants: participantOrder, declMap,
    boxes: all.filter((s): s is BoxDeclNode => s.type === "BOX_DECL"),
    statements: all.filter((s): s is StatementNode => s.type !== "BOX_DECL"),
    errors
  };
}
