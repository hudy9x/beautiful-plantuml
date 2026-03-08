export function JumpIcon({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="4" y1="10" x2="11" y2="10" />
      <line x1="4" y1="14" x2="8" y2="14" />
      <polyline points="15 14 18 17 21 14" />
      <path d="M18 11V17" />
    </svg>
  );
}
