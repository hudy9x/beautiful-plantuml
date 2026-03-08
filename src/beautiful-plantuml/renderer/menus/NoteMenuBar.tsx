
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";
import { EditIcon, JumpIcon } from "../../icons";

function findNode(ast: any, id: string): any {
  function search(stmts: any[]): any {
    for (const s of stmts) {
      if (s.id === id) return s;
      if (s.type === "ALT_BLOCK") for (const b of s.branches) { const f = search(b.statements); if (f) return f; }
      if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") { const f = search(s.statements); if (f) return f; }
    }
    return null;
  }
  return search(ast.statements);
}

/**
 * Shows when a note is selected.
 * Replace with your own component to customize the note context menu.
 */
export function NoteMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:") || selectedNodeId.includes(":")) return null;

  const node = findNode(ast, selectedNodeId);
  if (!node || node.type !== "NOTE") return null;

  const currentText = node.lines.join("\\n");

  return (
    <MenuPopover
      position={clickPosition}
      title="Note Actions"
      subtitle={<span>{node.position} {[node.p1, node.p2].filter(Boolean).join(", ")}</span>}
    >
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <ActionButton icon={<EditIcon width={14} height={14} />} onClick={async () => {
          const newText = await actions.prompt("Edit note text (use \\n for newlines):", currentText);
          if (newText !== null) actions.editNodeLabel(selectedNodeId, newText);
        }} label="Edit note" />
        <ActionButton icon={<JumpIcon width={14} height={14} />} onClick={() => actions.jump(selectedNodeId)} label="Jump to line" />
        <ActionButton icon={
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        } onClick={() => actions.deleteNode(selectedNodeId)} label="Delete note" danger />
      </div>
    </MenuPopover>
  );
}
