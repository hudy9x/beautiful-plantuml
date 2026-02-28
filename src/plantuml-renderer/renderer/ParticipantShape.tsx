import React from "react";
import { type ParticipantKind } from "../types";
import { C, SHAPE_W, SHAPE_H } from "../theme";

export function ParticipantShape({ kind, name, accent = C.accent, bg }: { kind: ParticipantKind; name: string; accent?: string; bg?: string | null }) {
  const s = accent;
  // "#thistle" → "thistle" (CSS named color), "#AABBCC" stays "#AABBCC" (hex); fallback to surface
  const fill = bg
    ? /^#[0-9a-fA-F]{3,8}$/.test(bg) ? bg : bg.replace(/^#/, "")
    : C.surface;
  const fd = "#1f2937";
  const Svg = ({ children }: { children: React.ReactNode }) => <svg width={SHAPE_W} height={SHAPE_H} style={{ overflow: "visible" }}>{children}</svg>;
  const Label = () => <span style={{ fontSize: 11, color: s, fontWeight: "bold", whiteSpace: "nowrap" }}>{name}</span>;
  const Stack = ({ children }: { children: React.ReactNode }) => <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>{children}<Label /></div>;
  switch (kind) {
    case "participant": return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ background: fill, border: `1.5px solid ${s}`, borderRadius: 5, padding: "4px 14px", fontSize: 12, fontWeight: "bold", color: s, whiteSpace: "nowrap", boxShadow: `0 0 10px ${C.accentDim}` }}>{name}</div></div>;
    case "actor": return <Stack><Svg><circle cx="32" cy="10" r="8" stroke={s} strokeWidth="1.5" fill={fill} /><line x1="32" y1="18" x2="32" y2="36" stroke={s} strokeWidth="1.5" /><line x1="18" y1="26" x2="46" y2="26" stroke={s} strokeWidth="1.5" /><line x1="32" y1="36" x2="20" y2="50" stroke={s} strokeWidth="1.5" /><line x1="32" y1="36" x2="44" y2="50" stroke={s} strokeWidth="1.5" /></Svg></Stack>;
    case "boundary": return <Stack><Svg><line x1="14" y1="10" x2="14" y2="42" stroke={s} strokeWidth="2.5" /><line x1="14" y1="26" x2="24" y2="26" stroke={s} strokeWidth="1.5" /><circle cx="38" cy="26" r="14" stroke={s} strokeWidth="1.5" fill={fill} /></Svg></Stack>;
    case "control": return <Stack><Svg><circle cx="32" cy="26" r="16" stroke={s} strokeWidth="1.5" fill={fill} /><path d="M 40 12 A 14 14 0 0 1 46 22" stroke={s} strokeWidth="1.5" fill="none" /><polygon points="46,22 50,14 41,16" fill={s} /></Svg></Stack>;
    case "entity": return <Stack><Svg><circle cx="32" cy="26" r="16" stroke={s} strokeWidth="1.5" fill={fill} /><line x1="17" y1="38" x2="47" y2="38" stroke={s} strokeWidth="1.5" /></Svg></Stack>;
    case "database": return <Stack><Svg><rect x="16" y="16" width="32" height="26" stroke={s} strokeWidth="1.5" fill={fill} rx="2" /><ellipse cx="32" cy="16" rx="16" ry="5" stroke={s} strokeWidth="1.5" fill={fill} /><path d="M16 42 Q32 48 48 42" stroke={s} strokeWidth="1.5" fill="none" /></Svg></Stack>;
    case "collections": return <Stack><Svg><rect x="22" y="10" width="28" height="22" stroke={s} strokeWidth="1.2" fill={fd} rx="1" /><rect x="19" y="13" width="28" height="22" stroke={s} strokeWidth="1.2" fill={fd} rx="1" /><rect x="16" y="16" width="28" height="22" stroke={s} strokeWidth="1.5" fill={fill} rx="1" /></Svg></Stack>;
    case "queue": return <Stack><Svg><rect x="12" y="14" width="40" height="22" stroke={s} strokeWidth="1.5" fill={fill} rx="11" /><ellipse cx="12" cy="25" rx="4" ry="11" stroke={s} strokeWidth="1.5" fill={fill} /></Svg></Stack>;
    default: return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ background: fill, border: `1.5px solid ${s}`, borderRadius: 5, padding: "4px 14px", fontSize: 12, fontWeight: "bold", color: s, whiteSpace: "nowrap" }}>{name}</div></div>;
  }
}
