import type { BoxDeclNode, DiagramAST, StatementNode } from "../types";

export function astToString(ast: DiagramAST): string {
  const lines: string[] = ["@startuml"];
  if (ast.title) lines.push(`title ${ast.title}`);
  if (ast.autonumber) lines.push("autonumber");
  lines.push("");

  const boxedAliases = new Set<string>();
  ast.boxes.forEach(b => b.allAliases.forEach(a => boxedAliases.add(a)));

  const boxByFirstAlias = new Map<string, BoxDeclNode>();
  ast.boxes.forEach(b => {
    if (b.allAliases.length > 0) boxByFirstAlias.set(b.allAliases[0], b);
  });

  const printedBoxes = new Set<BoxDeclNode>();

  function serializeBox(b: BoxDeclNode, indent: string) {
    let s = `${indent}box`;
    if (b.title) s += ` "${b.title}"`;
    if (b.color) s += ` ${b.color}`;
    lines.push(s);
    b.directAliases.forEach(a => {
      const p = ast.declMap[a];
      if (p) {
        let ps = `${indent}  ${p.kind} "${p.name}" as ${p.alias}`;
        if (p.name === p.alias && !p.name.includes(" ")) ps = `${indent}  ${p.kind} ${p.name}`;
        if (p.stereoType) ps += ` <<${p.stereoType}>>`;
        if (p.color) ps += ` ${p.color}`;
        lines.push(ps);
      }
    });
    b.children.forEach(c => serializeBox(c, indent + "  "));
    lines.push(`${indent}end box`);
  }

  let hasDecls = false;
  ast.participants.forEach(p => {
    if (boxByFirstAlias.has(p.alias)) {
      const b = boxByFirstAlias.get(p.alias)!;
      if (!printedBoxes.has(b)) {
        serializeBox(b, "");
        printedBoxes.add(b);
        hasDecls = true;
      }
    }
    if (!boxedAliases.has(p.alias)) {
      let s = `${p.kind} "${p.name}" as ${p.alias}`;
      if (p.name === p.alias && !p.name.includes(" ")) s = `${p.kind} ${p.name}`;
      if (p.stereoType) s += ` <<${p.stereoType}>>`;
      if (p.color) s += ` ${p.color}`;
      lines.push(s);
      hasDecls = true;
    }
  });
  if (hasDecls) lines.push("");

  function serializeStmts(stmts: StatementNode[], indent: string) {
    stmts.forEach(s => {
      if (s.type === "DIVIDER") {
        lines.push(`${indent}== ${s.label} ==`);
      } else if (s.type === "MESSAGE") {
        let msg = `${indent}${s.from} ${s.arrow} ${s.to}`;
        if (s.label) msg += ` : ${s.label}`;
        lines.push(msg);
      } else if (s.type === "NOTE") {
        const cText = s.color ? ` ${s.color}` : "";
        if (s.position === "across") {
          if (s.lines.length === 1) lines.push(`${indent}note across${cText} : ${s.lines[0]}`);
          else {
            lines.push(`${indent}note across${cText}`);
            s.lines.forEach(l => lines.push(`${indent}${l}`));
            lines.push(`${indent}end note`);
          }
        } else if (s.position === "over") {
          let target = s.p1!;
          if (s.p2) target += `, ${s.p2}`;
          if (s.lines.length === 1) lines.push(`${indent}note over ${target}${cText} : ${s.lines[0]}`);
          else {
            lines.push(`${indent}note over ${target}${cText}`);
            s.lines.forEach(l => lines.push(`${indent}${l}`));
            lines.push(`${indent}end note`);
          }
        } else {
          const bare = !s.p1;
          if (bare) {
            if (s.lines.length === 1) lines.push(`${indent}note ${s.position}${cText} : ${s.lines[0]}`);
            else {
              lines.push(`${indent}note ${s.position}${cText}`);
              s.lines.forEach(l => lines.push(`${indent}${l}`));
              lines.push(`${indent}end note`);
            }
          } else {
            if (s.lines.length === 1) lines.push(`${indent}note ${s.position} of ${s.p1}${cText} : ${s.lines[0]}`);
            else {
              lines.push(`${indent}note ${s.position} of ${s.p1}${cText}`);
              s.lines.forEach(l => lines.push(`${indent}${l}`));
              lines.push(`${indent}end note`);
            }
          }
        }
      } else if (s.type === "ALT_BLOCK") {
        s.branches.forEach((b, i) => {
          if (i === 0) lines.push(`${indent}alt ${b.condition}`);
          else if (b.condition) lines.push(`${indent}else ${b.condition}`);
          else lines.push(`${indent}else`);
          serializeStmts(b.statements, indent + "  ");
        });
        lines.push(`${indent}end`);
      } else if (s.type === "GROUP_BLOCK") {
        lines.push(`${indent}group ${s.label}`);
        serializeStmts(s.statements, indent + "  ");
        lines.push(`${indent}end`);
      } else if (s.type === "LOOP_BLOCK") {
        lines.push(`${indent}loop ${s.label}`);
        serializeStmts(s.statements, indent + "  ");
        lines.push(`${indent}end`);
      }
    });
  }

  serializeStmts(ast.statements, "");

  lines.push("");
  lines.push("@enduml");
  return lines.join("\n");
}