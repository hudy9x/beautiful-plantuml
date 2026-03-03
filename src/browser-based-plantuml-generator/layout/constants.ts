// Layout constants
export const COL_MIN_W = 90;   // minimum gap between two adjacent participant centers
export const COL_PAD = 20;   // padding added on each side of the label text (total 40px margin)
export const CHAR_W = 7.2;  // estimated px per character in message labels
export const PART_H = 80;   // participant header/footer area height (px)
export const NOTE_FONT = 11;
export const NOTE_LINE_H = NOTE_FONT * 1.65;
export const NOTE_PAD_V = 10;
export const NOTE_PAD_H = 14;
export const MSG_H = 44;   // total height of one message row
export const MSG_LABEL_OFF = 20;   // y of first label baseline from row top
export const MSG_LINE_H = 14;   // height per extra label line
export const MSG_ARROW_BOT = 10;   // gap from bottom of row to arrow line
export const DIVIDER_H = 36;
export const BLOCK_HDR_H = 26;
export const BLOCK_PAD_X = 24;
export const BLOCK_PAD_Y = 8;
export const BOX_TITLE_H = 22;
export const GAP = 10;


export const SELF_LOOP_W = 36;  // px the loop extends right of lifeline
export const SELF_LOOP_H = 18;  // px height of the loop rectangle
export const SELF_LOOP_GAP = 6;   // px gap between last label line and loop top

export const BOX_SHAPE_PAD = 10; // px of padding between shape edge and box border
export const BOX_GAP = 3;  // px gap between adjacent box borders at the midpoint

export const NAMED_RGB: Record<string, string> = {
  lightblue: "173,216,230", lightgray: "211,211,211", lightgrey: "211,211,211",
  lightyellow: "255,255,224", lightgreen: "144,238,144", lightpink: "255,182,193",
  lightsalmon: "255,160,122", lightcoral: "240,128,128", lavender: "230,230,250",
  aqua: "0,255,255", cyan: "0,255,255", pink: "255,192,203", yellow: "255,255,0",
  orange: "255,165,0", green: "0,128,0", blue: "0,0,255", red: "255,0,0",
  gray: "128,128,128", grey: "128,128,128", white: "255,255,255", beige: "245,245,220",
  wheat: "245,222,179", khaki: "240,230,140", plum: "221,160,221", violet: "238,130,238",
  turquoise: "64,224,208", skyblue: "135,206,235", steelblue: "70,130,180",
};
