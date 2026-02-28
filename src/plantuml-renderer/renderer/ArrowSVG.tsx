import { C, MSG_EXTRA_V } from "../theme";

let _aid = 0;

export function ArrowSVG({ arrow, x1pct, x2pct, rowH }: { arrow: string; x1pct: number; x2pct: number; rowH: number }) {
  const id = `ah${_aid++}`, isDashed = arrow.includes("--"), color = C.arrow, y = rowH - MSG_EXTRA_V / 2;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}>
      <defs><marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill={color} /></marker></defs>
      <line x1={`${x1pct}%`} y1={y} x2={`${x2pct}%`} y2={y} stroke={color} strokeWidth="1.5" strokeDasharray={isDashed ? "5,3" : undefined} markerEnd={`url(#${id})`} />
    </svg>
  );
}
