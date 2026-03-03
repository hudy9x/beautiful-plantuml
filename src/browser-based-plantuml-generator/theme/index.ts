
export const THEMES = {
  dark: {
    "--c-bg": "#0d1117",
    "--c-surface": "#161b22",
    "--c-border": "#30363d",
    "--c-accent": "#79c0ff",
    "--c-text": "#cdd9e5",
    "--c-muted": "#768390",
    "--c-arrow": "#c3c3c3",
    "--c-altBorder": "#444c56", "--c-altLabel": "#e3b341", "--c-altBg": "rgba(255,255,255,0.04)",
    "--c-groupBorder": "#6e7fd2", "--c-groupLabel": "#a5b4fc", "--c-groupBg": "rgba(99,102,241,0.08)",
    "--c-loopBorder": "#3d9e6e", "--c-loopLabel": "#6ee7b7", "--c-loopBg": "rgba(52,211,153,0.06)",
    "--c-noteBg": "#fefce8", "--c-noteBorder": "#b5a642", "--c-noteText": "#2d2a00",
    "--c-dividerLine": "#58a6ff", "--c-dividerText": "#58a6ff",
    "--c-lifeline": "#295875ff",
  },
  light: {
    "--c-bg": "#ffffff",
    "--c-surface": "#f6f8fa",
    "--c-border": "#d0d7de",
    "--c-accent": "#0969da",
    "--c-text": "#24292f",
    "--c-muted": "#57606a",
    "--c-arrow": "#24292f",
    "--c-altBorder": "#d0d7de", "--c-altLabel": "#9e740d", "--c-altBg": "rgba(0,0,0,0.02)",
    "--c-groupBorder": "#54aeff", "--c-groupLabel": "#0969da", "--c-groupBg": "rgba(9,105,218,0.04)",
    "--c-loopBorder": "#2da44e", "--c-loopLabel": "#1a7f37", "--c-loopBg": "rgba(45,164,78,0.04)",
    "--c-noteBg": "#fff8c5", "--c-noteBorder": "#d4a72c", "--c-noteText": "#24292f",
    "--c-dividerLine": "#0969da", "--c-dividerText": "#0969da",
    "--c-lifeline": "#8c959f",
  }
};

export const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  border: "var(--c-border)",
  accent: "var(--c-accent)",
  text: "var(--c-text)",
  muted: "var(--c-muted)",
  arrow: "var(--c-arrow)",
  altBorder: "var(--c-altBorder)", altLabel: "var(--c-altLabel)", altBg: "var(--c-altBg)",
  groupBorder: "var(--c-groupBorder)", groupLabel: "var(--c-groupLabel)", groupBg: "var(--c-groupBg)",
  loopBorder: "var(--c-loopBorder)", loopLabel: "var(--c-loopLabel)", loopBg: "var(--c-loopBg)",
  noteBg: "var(--c-noteBg)", noteBorder: "var(--c-noteBorder)", noteText: "var(--c-noteText)",
  dividerLine: "var(--c-dividerLine)", dividerText: "var(--c-dividerText)",
  lifeline: "var(--c-lifeline)",
} as const;
