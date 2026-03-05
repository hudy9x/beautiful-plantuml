import React from 'react';

export function BoundaryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
  <line x1="4" y1="4" x2="4" y2="20"/><line x1="4" y1="12" x2="10" y2="12"/><circle cx="15" cy="12" r="5"/>
</svg>
  );
}
