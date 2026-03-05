import React from 'react';

export function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
  <line x1="6" y1="3" x2="6" y2="21" strokeDasharray="4 4"/><line x1="18" y1="3" x2="18" y2="21" strokeDasharray="4 4"/><line x1="9" y1="12" x2="15" y2="12"/><polyline points="12 9 15 12 12 15"/>
</svg>
  );
}
