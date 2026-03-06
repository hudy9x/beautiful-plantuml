
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";
import { C } from "../../theme";
import { EditIcon, MessageIcon, DeleteIcon, ElseIcon } from "../../icons";

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
 * Shows for `alt` (first branch, branchIdx === 0) and `else` (branchIdx > 0) branches.
 * Replace with your own component to customize the alt/else context menu.
 */
export function AltMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:")) return null;

  const [baseId, branchIdxStr] = selectedNodeId.split(":");
  const branchIdx = branchIdxStr !== undefined ? parseInt(branchIdxStr, 10) : undefined;
  if (branchIdx === undefined) return null;

  const node = findNode(ast, baseId);
  if (!node || node.type !== "ALT_BLOCK") return null;
  if (!node.branches[branchIdx]) return null;

  const isAlt = branchIdx === 0;
  const label = isAlt ? "Alt" : "Else";
  const condition = node.branches[branchIdx].condition;

  return (
    <MenuPopover
      position={clickPosition}
      title={`${label} Actions`}
      subtitle={
        <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 6, textAlign: "left" }}>
          {label}: {condition || "(empty)"}
        </div>
      }
    >
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <ActionButton icon={<EditIcon width={14} height={14} />} onClick={async () => {
          const newCond = await actions.prompt(`Edit ${label.toLowerCase()} condition:`, condition);
          if (newCond !== null) actions.editNodeLabel(baseId, newCond, branchIdx);
        }} label="Edit condition" />
        <ActionButton icon={<MessageIcon width={14} height={14} />} onClick={() => actions.createMessage(baseId, "inside", branchIdx)} label="Create message" />
        <ActionButton icon={<ElseIcon width={14} height={14} />} onClick={() => actions.createElse(baseId, branchIdx)} label="Create else" />
        {!isAlt ? (
          <ActionButton icon={<DeleteIcon width={14} height={14} />} onClick={() => actions.deleteElse(baseId, branchIdx)} label="Delete else" danger />
        ) : (
          <ActionButton icon={<DeleteIcon width={14} height={14} />} onClick={() => actions.deleteNode(baseId)} label="Delete alt" danger />
        )}
      </div>
    </MenuPopover>
  );
}
