import { useState } from "react";

export function DepdokBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div style={{
      width: "220px",
      margin: "0 auto 16px auto", // Centers it if the container is wider, leaves spacing below
      backgroundColor: "#161b22", // Slightly lighter than #0d1117 so it stands out as a card
      border: "1px solid #30363d",
      borderRadius: "12px",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "absolute",
      bottom: "16px",
      left: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      zIndex: 20,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {/* Close Button at top right */}
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          backgroundColor: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#8b949e",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#cdd9e5"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#8b949e"}
        title="Dismiss banner"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* App Icon */}
      <img
        src="/depdok-app-icon.png"
        alt="Depdok Logo"
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "12px",
          objectFit: "cover",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          marginBottom: "12px",
        }}
      />

      {/* Content Body */}
      <h3 style={{
        margin: "0 0 6px 0",
        fontSize: "15px",
        fontWeight: 600,
        color: "#cdd9e5",
        letterSpacing: "-0.01em",
        textAlign: "center",
      }}>
        Get Depdok
      </h3>

      <p style={{
        margin: "0 0 16px 0",
        fontSize: "12px",
        color: "#8b949e",
        lineHeight: "1.4",
        textAlign: "center",
      }}>
        Lightweight, offline-first
        editor for developers which support PlantUML, Mermaid, Markdown, Todo.
      </p>

      {/* Action Button */}
      <a
        href="https://depdok.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          width: "100%",
          padding: "10px 0",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "20px", // Pill-shaped to match the Apple style from before
          textDecoration: "none",
          textAlign: "center",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
      >
        Join now
      </a>
    </div>
  );
}
