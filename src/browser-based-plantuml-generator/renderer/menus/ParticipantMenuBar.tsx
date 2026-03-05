import React from "react";
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";

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
      <ActionButton onClick={() => actions.createParticipant(alias)} label="Create participant" />
      <ActionButton onClick={() => {
        const str = window.prompt("Edit participant:", declStr);
        if (str !== null) actions.editParticipant(alias, str);
      }} label="Edit participant" />
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <ActionButton onClick={() => actions.moveParticipant(alias, "left")} label="Move Left" />
        </div>
        <div style={{ flex: 1 }}>
          <ActionButton onClick={() => actions.moveParticipant(alias, "right")} label="Move Right" />
        </div>
      </div>
      <ActionButton onClick={() => actions.deleteParticipant(alias)} label="Delete participant" danger />
    </MenuPopover>
  );
}
