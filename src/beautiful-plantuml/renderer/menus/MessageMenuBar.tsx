
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";
import type { MessageNode } from "../../types";
import { MessageIcon, EditIcon, DeleteIcon } from "../../icons";

/**
 * Shows when a message arrow is selected.
 * Replace this component with your own to fully customize the message context menu.
 */
export function MessageMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:")) return null;

  const baseId = selectedNodeId.split(":")[0];
  const node = ast.statements.flatMap(function search(s): any[] {
    if (s.id === baseId) return [s];
    if (s.type === "ALT_BLOCK") return s.branches.flatMap(b => b.statements.flatMap(search));
    if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") return s.statements.flatMap(search);
    return [];
  })[0];

  if (!node || node.type !== "MESSAGE") return null;
  const msg = node as MessageNode;

  const currentStr = msg.label
    ? `${msg.from} ${msg.arrow} ${msg.to}: ${msg.label}`
    : `${msg.from} ${msg.arrow} ${msg.to}`;

  return (
    <MenuPopover
      position={clickPosition}
      title="Message Actions"
      subtitle={<span>{msg.from} ➔ {msg.to}</span>}
    >
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <ActionButton icon={<MessageIcon width={14} height={14} />} onClick={() => actions.createMessage(baseId, "after")} label="Create Message" />
        <ActionButton icon={<EditIcon width={14} height={14} />} onClick={async () => {
          const newStr = await actions.prompt("Edit message:", currentStr);
          if (newStr !== null) actions.editNodeLabel(baseId, newStr);
        }} label="Edit Message" />
        <ActionButton icon={<DeleteIcon width={14} height={14} />} onClick={() => actions.deleteNode(baseId)} label="Delete Message" danger />
      </div>
    </MenuPopover>
  );
}
