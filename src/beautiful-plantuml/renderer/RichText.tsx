import React from 'react';

// Parses PlantUML rich text markers into a React node array (using SVG <tspan> elements).
export function parseRichText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // The state of our current text styling
  let isBold = false;
  let isItalic = false;
  let isMono = false;
  let isStrike = false;
  let isUnderline = false;
  let isWaved = false;
  const colors: string[] = []; // Stack for colors
  
  const tokenRegex = /(<font\s+color=(?:"([^"]+)"|([^\s>]+))[^>]*>|<\/font>|\*\*|\/\/|""|--|__|~~)/g;
  const result: React.ReactNode[] = [];
  
  let lastIndex = 0;
  let match;
  
  function renderSegment(str: string, key: number) {
    if (!isBold && !isItalic && !isMono && !isStrike && !isUnderline && !isWaved && colors.length === 0) {
      return <React.Fragment key={key}>{str}</React.Fragment>;
    }
    
    let textDecoration = "";
    if (isStrike) textDecoration += "line-through ";
    if (isWaved) textDecoration += "underline wavy ";
    else if (isUnderline) textDecoration += "underline ";
    
    const style: React.CSSProperties = {};
    if (textDecoration.trim()) style.textDecoration = textDecoration.trim();
    
    const currentColor = colors.length > 0 ? colors[colors.length - 1] : undefined;
    
    return (
      <tspan
        key={key}
        fontWeight={isBold ? "bold" : undefined}
        fontStyle={isItalic ? "italic" : undefined}
        fontFamily={isMono ? "monospace" : undefined}
        fill={currentColor}
        style={Object.keys(style).length > 0 ? style : undefined}
      >
        {str}
      </tspan>
    );
  }
  
  while ((match = tokenRegex.exec(text)) !== null) {
    // Push preceding text as a tspan with current styles if there is any
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      result.push(renderSegment(segment, result.length));
    }
    
    const token = match[0];
    if (token.startsWith('<font')) {
      const color = match[2] || match[3];
      colors.push(color);
    } else if (token === '</font>') {
      if (colors.length > 0) colors.pop();
    } else if (token === '**') {
      isBold = !isBold;
    } else if (token === '//') {
      isItalic = !isItalic;
    } else if (token === '""') {
      isMono = !isMono;
    } else if (token === '--') {
      isStrike = !isStrike;
    } else if (token === '__') {
      isUnderline = !isUnderline;
    } else if (token === '~~') {
      isWaved = !isWaved;
    }
    
    lastIndex = tokenRegex.lastIndex;
  }
  
  // Push remaining text
  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    result.push(renderSegment(segment, result.length));
  }
  
  return result;
}

export function RichText({ text }: { text: string }) {
  return <>{parseRichText(text)}</>;
}
