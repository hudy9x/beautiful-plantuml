
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";
import { EditIcon, MessageIcon, DeleteIcon } from "../../icons";

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
 * Shows when a loop block is selected.
 * Replace with your own component to customize the loop context menu.
 */
export function LoopMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:") || selectedNodeId.includes(":")) return null;

  const node = findNode(ast, selectedNodeId);
  if (!node || node.type !== "LOOP_BLOCK") return null;

  return (
    <MenuPopover position={clickPosition} title="Loop Actions" subtitle={<span>{node.label || "(no label)"}</span>}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <ActionButton icon={<EditIcon width={14} height={14} />} onClick={async () => {
          const newLbl = await actions.prompt("Edit loop label:", node.label);
          if (newLbl !== null) actions.editNodeLabel(selectedNodeId, newLbl);
        }} label="Edit header" />
        <ActionButton icon={<MessageIcon width={14} height={14} />} onClick={() => actions.createMessage(selectedNodeId, "inside")} label="Create message" />
        <ActionButton icon={<DeleteIcon width={14} height={14} />} onClick={() => actions.deleteNode(selectedNodeId)} label="Delete block" danger />
      </div>
    </MenuPopover>
  );
}
