import { C } from "../theme";
import type { ParticipantKind } from "../types";
import { resolveBoxRGB } from "../utils";

function shapeParticipant(name: string, s: string, bg: string, sIconChar: string, sIconColor: string, sTitle: string) {
  let w = name.length * 7.2 + 18;
  let stereoW = sTitle ? sTitle.length * 7.2 + 20 : 0;
  if (sIconChar) stereoW += 20;
  const tw = Math.max(44, w, stereoW);
  const h = sTitle ? 44 : 28;
  const topY = -h / 2;

  return <>
    <rect x={-tw / 2} y={topY} width={tw} height={h} rx={4}
      fill={bg} stroke={s} strokeWidth={1.5} className="participant-box" />
    {sTitle && (
      <g transform={`translate(0, ${topY + 14})`}>
        {sIconChar && (
          <g transform={`translate(${-(sTitle.length * 3.6) - 10}, 0)`}>
            <circle cx={0} cy={-4} r={8} fill={sIconColor} stroke={s} strokeWidth={1} />
            <text x={0} y={0} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#000">{sIconChar}</text>
          </g>
        )}
        <text x={sIconChar ? 8 : 0} y={0} textAnchor="middle" fontSize={11} fontStyle="italic" fill={s}>
          {`«${sTitle}»`}
        </text>
      </g>
    )}
    <text x={0} y={sTitle ? topY + 32 : 4} textAnchor="middle" fontSize={11} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeActor(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={-24} r={7} fill={bg} stroke={s} strokeWidth={1.5} className="actor-head" />
    <line x1={0} y1={-17} x2={0} y2={-2} stroke={s} strokeWidth={1.5} className="actor-body" />
    <line x1={-12} y1={-11} x2={12} y2={-11} stroke={s} strokeWidth={1.5} className="actor-arms" />
    <line x1={0} y1={-2} x2={-9} y2={12} stroke={s} strokeWidth={1.5} className="actor-leg-l" />
    <line x1={0} y1={-2} x2={9} y2={12} stroke={s} strokeWidth={1.5} className="actor-leg-r" />
    <text x={0} y={28} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeBoundary(name: string, s: string, bg: string) {
  return <>
    <line x1={-19} y1={-14} x2={-19} y2={14} stroke={s} strokeWidth={2.5} />
    <line x1={-19} y1={0} x2={-10} y2={0} stroke={s} strokeWidth={1.5} />
    <circle cx={2} cy={0} r={12} fill={bg} stroke={s} strokeWidth={1.5} className="boundary-circle" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeControl(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={0} r={14} fill={bg} stroke={s} strokeWidth={1.5} className="control-circle" />
    <path d="M 7 -12 A 12 12 0 0 1 13 -4" stroke={s} strokeWidth={1.5} fill="none" className="control-arrow-arc" />
    <polygon points="13,-4 17,-12 9,-10" fill={s} className="control-arrow-head" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeEntity(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={0} r={14} fill={bg} stroke={s} strokeWidth={1.5} className="entity-circle" />
    <line x1={-14} y1={10} x2={14} y2={10} stroke={s} strokeWidth={1.5} className="entity-underline" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeDatabase(name: string, s: string, bg: string) {
  return <>
    <rect x={-14} y={-12} width={28} height={22} fill={bg} stroke={s} strokeWidth={1.5} rx={2} className="database-body" />
    <ellipse cx={0} cy={-12} rx={14} ry={4} fill={bg} stroke={s} strokeWidth={1.5} className="database-top" />
    <path d="M-14 10 Q0 16 14 10" stroke={s} strokeWidth={1.5} fill="none" className="database-bottom" />
    <text x={0} y={32} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeCollections(name: string, s: string, bg: string) {
  const fd = "#1f2937";
  return <>
    <rect x={-7} y={-14} width={24} height={18} fill={fd} stroke={s} strokeWidth={1.2} rx={1} />
    <rect x={-10} y={-11} width={24} height={18} fill={fd} stroke={s} strokeWidth={1.2} rx={1} />
    <rect x={-13} y={-8} width={24} height={18} fill={bg} stroke={s} strokeWidth={1.5} rx={1} className="collections-front" />
    <text x={-1} y={22} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeQueue(name: string, s: string, bg: string) {
  return <>
    <rect x={-16} y={-10} width={32} height={20} fill={bg} stroke={s} strokeWidth={1.5} rx={10} className="queue-body" />
    <ellipse cx={-11} cy={0} rx={7} ry={10} fill={bg} stroke={s} strokeWidth={1.5} className="queue-left-cap" />
    <text x={0} y={26} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}

const SHAPE_FNS: Record<ParticipantKind, (n: string, s: string, bg: string, sIconChar: string, sIconColor: string, sTitle: string) => React.ReactNode> = {
  participant: shapeParticipant, actor: shapeActor, boundary: shapeBoundary,
  control: shapeControl, entity: shapeEntity, database: shapeDatabase,
  collections: shapeCollections, queue: shapeQueue,
};

export function ParticipantShape({ kind, name, cx, cy, stroke, stereoType, fill, dataId }:
  { kind: ParticipantKind; name: string; cx: number; cy: number; stroke: string; stereoType?: string; fill?: string; dataId?: string; }) {

  const rgb = fill ? resolveBoxRGB(fill) : undefined;
  const bg = rgb ? `rgb(${rgb})` : C.surface;

  let sIconChar = "", sIconColor = "", sTitle = stereoType || "";
  if (stereoType) {
    const match = stereoType.match(/^\(([A-Za-z0-9]),\s*(#[A-Za-z0-9]+)\)\s*(.*)$/);
    if (match) {
      sIconChar = match[1];
      sIconColor = match[2];
      sTitle = match[3];
    }
  }

  return (
    <g transform={`translate(${cx},${cy})`}
      className={`participant participant-${kind}`} data-name={name} data-id={dataId} style={dataId ? { cursor: "pointer" } : undefined}>
      {(SHAPE_FNS[kind] ?? shapeParticipant)(name, stroke, bg, sIconChar, sIconColor, sTitle)}
    </g>
  );
}
