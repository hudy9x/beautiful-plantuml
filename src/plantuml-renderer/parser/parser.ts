import {
  type DiagramAST, type Participant, type ParticipantKind,
  type MessageNode, type StatementNode, type AltBranch, type AltBlockNode,
  type GroupBlockNode, type LoopBlockNode, type BoxDeclNode, type NoteNode,
} from "../types";
import { tokenizeLine } from "./tokenizer";

export function parse(input: string): DiagramAST {
  const tokens = input.split("\n").map(tokenizeLine).filter((t): t is NonNullable<ReturnType<typeof tokenizeLine>> => t !== null);
  let pos = 0, msgIdx = 0;
  const hasAutonumber = tokens.some(t => t.type === "AUTONUMBER");
  const declMap: Record<string, Participant> = {};
  const participantOrder: Participant[] = [];
  const participantSet = new Set<string>();

  function registerParticipant(alias: string, name: string, kind: ParticipantKind, color?: string | null) {
    if (participantSet.has(alias)) return;
    const p: Participant = { alias, name, kind, color: color ?? null };
    participantSet.add(alias); participantOrder.push(p); declMap[alias] = p;
  }
  function ensureParticipant(alias: string) { registerParticipant(alias, alias, "participant"); }

  function collectNoteLines(): string[] {
    const lines: string[] = [];
    while (pos < tokens.length && tokens[pos].type !== "END_NOTE") {
      const tok = tokens[pos++];
      if (tok.type === "TEXT_LINE") lines.push(tok.text);
    }
    if (pos < tokens.length) pos++;
    return lines;
  }

  const STOP = new Set(["END", "ELSE", "END_BLOCK", "END_BOX"]);

  function parseStatements(ref: { current: MessageNode | null }): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (STOP.has(tok.type)) break;
      switch (tok.type) {
        case "BOX": { pos++; stmts.push(parseBox(tok.title, tok.color, ref)); break; }
        case "DECLARATION": { registerParticipant(tok.alias, tok.name, tok.kind, tok.color); pos++; break; }
        case "NOTE_INLINE": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: [tok.text] } as NoteNode); break; }
        case "NOTE_START": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: collectNoteLines() } as NoteNode); break; }
        case "NOTE_BARE_INLINE": { pos++; const p1b = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1: p1b, p2: null, color: tok.color, lines: [tok.text] } as NoteNode); break; }
        case "NOTE_BARE_START": { pos++; const p1s = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1: p1s, p2: null, color: tok.color, lines: collectNoteLines() } as NoteNode); break; }
        case "DIVIDER": { stmts.push({ type: "DIVIDER", label: tok.label }); pos++; break; }
        case "ALT": { const c = tok.condition; pos++; stmts.push(parseAlt(c, ref)); break; }
        case "GROUP": { const l = tok.label; pos++; stmts.push(parseGroup(l, ref)); break; }
        case "LOOP": { const l = tok.label; pos++; stmts.push(parseLoop(l, ref)); break; }
        case "MESSAGE": {
          msgIdx++;
          ensureParticipant(tok.from); ensureParticipant(tok.to);
          const fi = participantOrder.findIndex(p => p.alias === tok.from);
          const ti = participantOrder.findIndex(p => p.alias === tok.to);
          const msg: MessageNode = { type: "MESSAGE", from: tok.from, arrow: tok.arrow, to: tok.to, label: tok.label, idx: msgIdx, leftAlias: fi <= ti ? tok.from : tok.to, rightAlias: fi <= ti ? tok.to : tok.from };
          ref.current = msg; stmts.push(msg); pos++;
          break;
        }
        default: pos++;
      }
    }
    return stmts;
  }

  function parseAlt(cond: string, ref: { current: MessageNode | null }): AltBlockNode {
    const branches: AltBranch[] = [{ condition: cond, statements: parseStatements(ref) }];
    while (pos < tokens.length && tokens[pos].type === "ELSE") {
      const c = (tokens[pos] as { type: "ELSE"; condition: string }).condition; pos++;
      branches.push({ condition: c, statements: parseStatements(ref) });
    }
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "ALT_BLOCK", branches };
  }
  function parseGroup(label: string, ref: { current: MessageNode | null }): GroupBlockNode {
    const s = parseStatements(ref);
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "GROUP_BLOCK", label, statements: s };
  }
  function parseLoop(label: string, ref: { current: MessageNode | null }): LoopBlockNode {
    const s = parseStatements(ref);
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "LOOP_BLOCK", label, statements: s };
  }
  function parseBox(title: string | null, color: string | null, ref: { current: MessageNode | null }): BoxDeclNode {
    const direct: string[] = [], children: BoxDeclNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === "END_BOX" || tok.type === "END") { pos++; break; }
      if (tok.type === "BOX") { pos++; children.push(parseBox(tok.title, tok.color, ref)); }
      else if (tok.type === "DECLARATION") { registerParticipant(tok.alias, tok.name, tok.kind, tok.color); direct.push(tok.alias); pos++; }
      else { pos++; }
    }
    return { type: "BOX_DECL", title, color, directAliases: direct, children, allAliases: [...direct, ...children.flatMap(c => c.allAliases)] };
  }

  const ref = { current: null as MessageNode | null };
  const all = parseStatements(ref);
  return {
    autonumber: hasAutonumber,
    participants: participantOrder,
    declMap,
    boxes: all.filter((s): s is BoxDeclNode => s.type === "BOX_DECL"),
    statements: all.filter((s): s is StatementNode => s.type !== "BOX_DECL"),
  };
}
