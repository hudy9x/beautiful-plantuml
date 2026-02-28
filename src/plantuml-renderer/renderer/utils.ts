import { NOTE_LINE_H, NOTE_PAD_V, MSG_LABEL_LINE_H, MSG_ARROW_H, MSG_EXTRA_V } from "../theme";

export function noteHeight(lines: string[]): number {
  return Math.max(1, lines.length) * NOTE_LINE_H + NOTE_PAD_V + 6;
}

export function msgRowHeight(ll: string[]): number {
  return ll.length * MSG_LABEL_LINE_H + MSG_ARROW_H + MSG_EXTRA_V;
}

export function splitLabel(l: string): string[] {
  return l.split("\\n");
}

export function resolveCSSColor(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("#")) { const i = raw.slice(1); return /^[0-9a-fA-F]{3,6}$/.test(i) ? raw : i; }
  return raw;
}

export interface BoxColors { bg: string; border: string; text: string; }

const NAMED_RGB: Record<string, string> = {
  lightblue: "173,216,230", lightgray: "211,211,211", lightgrey: "211,211,211",
  lightyellow: "255,255,224", lightgreen: "144,238,144", lightpink: "255,182,193",
  lightsalmon: "255,160,122", lightcoral: "240,128,128", lavender: "230,230,250",
  aqua: "0,255,255", cyan: "0,255,255", pink: "255,192,203", yellow: "255,255,0",
  orange: "255,165,0", green: "0,128,0", blue: "0,0,255", red: "255,0,0",
  gray: "128,128,128", grey: "128,128,128", white: "255,255,255", beige: "245,245,220",
  wheat: "245,222,179", khaki: "240,230,140", plum: "221,160,221",
  violet: "238,130,238", turquoise: "64,224,208", skyblue: "135,206,235",
  steelblue: "70,130,180", cornflowerblue: "100,149,237",
};

function hexToRgb(h: string): string | null {
  const h6 = h.match(/^([0-9a-fA-F]{6})$/); if (h6) { const n = parseInt(h6[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  const h3 = h.match(/^([0-9a-fA-F]{3})$/); if (h3) { const [r, g, b] = h3[1].split("").map(c => parseInt(c + c, 16)); return `${r},${g},${b}`; }
  return null;
}

export function resolveBoxColors(raw: string | null): BoxColors {
  const name = raw ? (raw.startsWith("#") ? raw.slice(1) : raw) : "LightBlue";
  const rgb = NAMED_RGB[name.toLowerCase()] ?? hexToRgb(name) ?? NAMED_RGB.lightblue;
  return { bg: `rgba(${rgb},0.12)`, border: `rgba(${rgb},0.65)`, text: `rgba(${rgb},0.9)` };
}
