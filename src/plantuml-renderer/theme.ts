// ─── Colors ───────────────────────────────────────────────────────────────────

export const C = {
  bg: "#0d1117", surface: "#161b22", border: "#30363d",
  accent: "#79c0ff", accentDim: "#1c3452", text: "#cdd9e5", muted: "#768390",
  arrow: "#c3c3c3",
  altBorder: "#444c56", altLabel: "#e3b341", altBg: "rgba(255,255,255,0.025)",
  groupBorder: "#6e7fd2", groupLabel: "#a5b4fc", groupBg: "rgba(99,102,241,0.06)",
  loopBorder: "#3d9e6e", loopLabel: "#6ee7b7", loopBg: "rgba(52,211,153,0.05)",
  noteBg: "#fefce8", noteBorder: "#b5a642", noteText: "#2d2a00",
  dividerLine: "#58a6ff", dividerText: "#58a6ff",
  lifeline: "#546070",
} as const;

// ─── Layout constants ─────────────────────────────────────────────────────────

export const NOTE_FONT_SIZE = 11;
export const NOTE_LINE_H = NOTE_FONT_SIZE * 1.65;
export const NOTE_PAD_V = 10;
export const MSG_ARROW_H = 8;
export const MSG_LABEL_LINE_H = 15;
export const MSG_EXTRA_V = 22;
export const SHAPE_W = 64;
export const SHAPE_H = 52;
export const BOX_TITLE_ROW_H = 22;
export const PART_BAR_BASE_H = 50;
