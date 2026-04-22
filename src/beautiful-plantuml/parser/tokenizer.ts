import { PARTICIPANT_KINDS, type ArrowType, type NotePosition, type ParticipantKind, type Token } from "../types";

export function tokenizeLine(line: string): Token | null {
  const t = line.trim();
  if (!t) return { type: "EMPTY_LINE" };
  if (t === "@startuml") return { type: "START" };
  if (t === "@enduml") return { type: "END" };
  const autoNumM = t.match(/^autonumber(?:\s+(\S+))?.*$/i);
  if (autoNumM) return { type: "AUTONUMBER", start: autoNumM[1] };
  if (t === "end note") return { type: "END_NOTE" };
  if (t === "end box") return { type: "END_BOX" };
  if (t === "end") return { type: "END_BLOCK" };

  const titleM = t.match(/^title\s+(?:"([^"]+)"|(.+))$/i);
  if (titleM) return { type: "TITLE", text: titleM[1] ?? titleM[2] };

  const boxM = t.match(/^box(?:\s+"([^"]*)"|\s+([^#\s]\S*))?(?:\s+(#\S+))?(?:\s+(#\S+))?$/i);
  if (boxM) return { type: "BOX", title: boxM[1] ?? boxM[2] ?? null, color: boxM[3] ?? boxM[4] ?? null };

  for (const kind of PARTICIPANT_KINDS) {
    const m = t.match(new RegExp(`^${kind}\\s+(?:"([^"]+)"|([^"\\s]+))(?:\\s+as\\s+(?:"([^"]+)"|([^"\\s]+)))?(?:\\s+<<\\s*(.+?)\\s*>>)?(?:\\s+(#\\S+))?$`, "i"));
    if (m) {
      const name = m[1] ?? m[2];
      const alias = m[3] ?? m[4] ?? name;
      return { type: "DECLARATION", kind: kind as ParticipantKind, name, alias, stereoType: m[5]?.trim(), color: m[6] };
    }
  }

  const divM = t.match(/^==+\s*(.+?)\s*==+$/);
  if (divM) return { type: "DIVIDER", label: divM[1].trim() };

  const nAcrossI = t.match(/^note\s+across\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nAcrossI) return { type: "NOTE_INLINE", position: "across", p1: null, p2: null, color: nAcrossI[1] ?? null, text: nAcrossI[2].trim() };
  const nAcrossM = t.match(/^note\s+across\s*(#\S+)?$/i);
  if (nAcrossM) return { type: "NOTE_START", position: "across", p1: null, p2: null, color: nAcrossM[1] ?? null };

  const nOfI = t.match(/^note\s+(left|right)\s+(?:of\s+)?([^\s#:]+)\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nOfI) return { type: "NOTE_INLINE", position: nOfI[1].toLowerCase() as NotePosition, p1: nOfI[2], p2: null, color: nOfI[3] ?? null, text: nOfI[4].trim() };
  const nOfM = t.match(/^note\s+(left|right)\s+(?:of\s+)?([^\s#:]+)\s*(#\S+)?$/i);
  if (nOfM) return { type: "NOTE_START", position: nOfM[1].toLowerCase() as NotePosition, p1: nOfM[2], p2: null, color: nOfM[3] ?? null };

  const nOverI = t.match(/^note\s+over\s+(\S+?)(?:\s*,\s*(\S+))?\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nOverI) return { type: "NOTE_INLINE", position: "over", p1: nOverI[1], p2: nOverI[2] ?? null, color: nOverI[3] ?? null, text: nOverI[4].trim() };
  const nOverM = t.match(/^note\s+over\s+(\S+?)(?:\s*,\s*(\S+))?\s*(#\S+)?$/i);
  if (nOverM) return { type: "NOTE_START", position: "over", p1: nOverM[1], p2: nOverM[2] ?? null, color: nOverM[3] ?? null };

  const nBareI = t.match(/^note\s+(left|right)\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nBareI) return { type: "NOTE_BARE_INLINE", position: nBareI[1].toLowerCase() as "left" | "right", color: nBareI[2] ?? null, text: nBareI[3].trim() };
  const nBareM = t.match(/^note\s+(left|right)\s*(#\S+)?$/i);
  if (nBareM) return { type: "NOTE_BARE_START", position: nBareM[1].toLowerCase() as "left" | "right", color: nBareM[2] ?? null };

  const altM = t.match(/^alt\s+(.+)$/); if (altM) return { type: "ALT", condition: altM[1].trim() };
  const elseM = t.match(/^else(?:\s+(.+))?$/); if (elseM) return { type: "ELSE", condition: (elseM[1] ?? "").trim() };
  const grpM = t.match(/^group\s+(.+)$/); if (grpM) return { type: "GROUP", label: grpM[1].trim() };
  const loopM = t.match(/^loop(?:\s+(.+))?$/); if (loopM) return { type: "LOOP", label: (loopM[1] ?? "").trim() };

  // Arrow alternation — longest/most-specific first so the regex engine picks the right token.
  // Backslashes in PlantUML arrows: in the source text each \ is a single character.
  // In the JS regex literal each \ must be doubled → \\, and inside a character class it
  // needs \\\\. We build the alternation as a named-group-free non-capturing group.
  //
  // Supported arrows (both directions):
  //  o\\-- / --\\o   circle-tail dashed
  //  //--  / --//   slash-alias dashed  (same render as -->)
  //  --\\  / \\--   backslash-alias dashed
  //  -->   / <--    standard dashed
  //  ->x   / x<-   lost/destroyed head
  //  ->o   / o<-   circle head
  //  ->>   / <<-   open thin head
  //  o\\-  / -\\o  circle-tail solid
  //  -\\   / \\-   backslash-alias solid (same render as ->)
  //  ->    / <-    standard solid

  // String.raw avoids JS escape processing: String.raw`o\\--` is literally "o\\--"
  // which as a regex pattern means: o + one literal \ + two dashes → matches "o\--" in input.
  // Arrow alternation, longest/most-specific first so greedy match picks the right token.
  /* eslint-disable no-useless-escape */
  const ARROW_PAT = String.raw`o\\--|--\\o|//--|--//|--\\|\\--|-->|<--|->x|x<-|->o|o<-|->>|<<-|o\\-|-\\o|-\\|\\-|->|<-`;
  const msgM = t.match(new RegExp(`^(\\S+)\\s*(${ARROW_PAT})\\s*(\\S+)\\s*:\\s*(.+)$`));
  if (msgM) return { type: "MESSAGE", from: msgM[1], arrow: msgM[2] as ArrowType, to: msgM[3], label: msgM[4].trim() };
  const msgNoLabel = t.match(new RegExp(`^(\\S+)\\s*(${ARROW_PAT})\\s*(\\S+)\\s*$`));
  if (msgNoLabel) return { type: "MESSAGE", from: msgNoLabel[1], arrow: msgNoLabel[2] as ArrowType, to: msgNoLabel[3], label: "" };

  return { type: "TEXT_LINE", text: line.trimEnd() };
}
