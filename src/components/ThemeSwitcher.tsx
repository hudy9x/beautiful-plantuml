import type { CSSProperties } from 'react';

export type ThemeBase = 'default' | 'zinc' | 'nord' | 'catppuccin' | 'tokyo' | 'dracula' | 'github' | 'solarized';
export type ThemeMode = 'light' | 'dark';

interface ThemeSwitcherProps {
  theme: ThemeBase;
  mode: ThemeMode;
  onChangeTheme: (theme: ThemeBase) => void;
  onChangeMode: (mode: ThemeMode) => void;
  style?: CSSProperties;
}

const themeOptions: { id: ThemeBase; label: string; color: string }[] = [
  { id: 'default', label: 'Default', color: '#0969da' },
  { id: 'zinc', label: 'Zinc', color: '#18181b' },
  { id: 'nord', label: 'Nord', color: '#5e81ac' },
  { id: 'catppuccin', label: 'Catppuccin', color: '#cba6f7' },
  { id: 'tokyo', label: 'Tokyo', color: '#7aa2f7' },
  { id: 'dracula', label: 'Dracula', color: '#bd93f9' },
  { id: 'github', label: 'GitHub', color: '#24292f' },
  { id: 'solarized', label: 'Solarized', color: '#b58900' },
];

export function ThemeSwitcher({ theme, mode, onChangeTheme, onChangeMode, style }: ThemeSwitcherProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(30, 31, 34, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 99999,
        ...style
      }}
    >
      <div style={{ display: 'flex', gap: 4, marginRight: 8, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.2)' }}>
        <button
          onClick={() => onChangeMode('light')}
          style={{
            background: mode === 'light' ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: mode === 'light' ? '#ffffff' : '#a1a1aa',
            fontSize: 12,
            fontWeight: mode === 'light' ? 600 : 400,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.2s ease',
          }}
        >
          Light
        </button>
        <button
          onClick={() => onChangeMode('dark')}
          style={{
            background: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: mode === 'dark' ? '#ffffff' : '#a1a1aa',
            fontSize: 12,
            fontWeight: mode === 'dark' ? 600 : 400,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.2s ease',
          }}
        >
          Dark
        </button>
      </div>

      {themeOptions.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChangeTheme(opt.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            color: theme === opt.id ? '#ffffff' : '#a1a1aa',
            fontSize: 13,
            fontWeight: theme === opt.id ? 600 : 400,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (theme !== opt.id) e.currentTarget.style.color = '#e4e4e7';
          }}
          onMouseLeave={(e) => {
            if (theme !== opt.id) e.currentTarget.style.color = '#a1a1aa';
          }}
        >
          {/* Radio circle with theme color inside */}
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: opt.color,
              border: theme === opt.id ? '2px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.2)',
              boxShadow: theme === opt.id ? '0 0 0 1px rgba(255,255,255,0.3) inset' : 'none',
              transition: 'all 0.2s',
            }}
          />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
