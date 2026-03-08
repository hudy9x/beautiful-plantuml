
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";
import { ParticipantIcon, EditIcon, DeleteIcon, MoveLeftIcon, MoveRightIcon, JumpIcon } from "../../icons";

/**
 * Shows when a participant is selected.
 * Replace this component with your own to fully customize the participant context menu.
 */
export function ParticipantMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (!selectedNodeId.startsWith("participant:")) return null;

  const alias = selectedNodeId.split(":")[1];
  const p = ast.participants.find(x => x.alias === alias);
  if (!p) return null;

  let declStr = `${p.kind} "${p.name}" as ${p.alias}`;
  if (p.name === p.alias && !p.name.includes(" ")) declStr = `${p.kind} ${p.name}`;
  if (p.stereoType) declStr += ` <<${p.stereoType}>>`;
  if (p.color) declStr += ` ${p.color}`;

  return (
    <MenuPopover position={clickPosition} title="Participant Actions" subtitle={<span>{declStr}</span>}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
        <ActionButton icon={<ParticipantIcon width={14} height={14} />} onClick={() => actions.createParticipant(alias)} label="Create participant" />
        <ActionButton icon={<EditIcon width={14} height={14} />} onClick={async () => {
          const str = await actions.prompt("Edit participant:", declStr);
          if (str !== null) actions.editParticipant(alias, str);
        }} label="Edit participant" />
        <ActionButton icon={<MoveLeftIcon width={14} height={14} />} onClick={() => actions.moveParticipant(alias, "left")} label="Move Left" />
        <ActionButton icon={<MoveRightIcon width={14} height={14} />} onClick={() => actions.moveParticipant(alias, "right")} label="Move Right" />
        <ActionButton icon={<JumpIcon width={14} height={14} />} onClick={() => actions.jump(selectedNodeId)} label="Jump to line" />
        <ActionButton icon={<DeleteIcon width={14} height={14} />} onClick={() => actions.deleteParticipant(alias)} label="Delete participant" danger />
      </div>
    </MenuPopover>
  );
}
