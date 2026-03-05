/**
 * DiagramActions — composite of all individual MenuBar components.
 *
 * Use this for the default all-in-one menu experience, or import
 * individual MenuBar components from ./renderer/menus/ to customize.
 */
import { ParticipantMenuBar } from "./renderer/menus/ParticipantMenuBar";
import { MessageMenuBar } from "./renderer/menus/MessageMenuBar";
import { AltMenuBar } from "./renderer/menus/AltMenuBar";
import { GroupMenuBar } from "./renderer/menus/GroupMenuBar";
import { LoopMenuBar } from "./renderer/menus/LoopMenuBar";
import { DividerMenuBar } from "./renderer/menus/DividerMenuBar";
import { NoteMenuBar } from "./renderer/menus/NoteMenuBar";

export function DiagramActions() {
  return (
    <>
      <ParticipantMenuBar />
      <MessageMenuBar />
      <AltMenuBar />
      <GroupMenuBar />
      <LoopMenuBar />
      <DividerMenuBar />
      <NoteMenuBar />
    </>
  );
}
