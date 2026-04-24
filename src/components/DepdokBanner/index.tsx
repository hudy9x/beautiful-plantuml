import { useState } from "react";

const BANNER_DISMISSED_KEY = "depdok-banner-dismissed-until";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!val) return false;
    return Date.now() < parseInt(val, 10);
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(BANNER_DISMISSED_KEY, String(Date.now() + ONE_DAY_MS));
  } catch { /* ignore */ }
}

export function DepdokBanner() {
  const [isVisible, setIsVisible] = useState(() => !isDismissed());

  const handleClose = () => {
    dismiss();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: "16px",
      left: "16px",
      width: "220px",
      backgroundColor: "#161b22",
      border: "1px solid #30363d",
      borderRadius: "0",          // WIRED: square corners
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      zIndex: 30,                 // above overflow:hidden siblings
      boxShadow: "none",          // WIRED: no shadows
      borderTop: "1px solid #30363d",
    }}>
      {/* Close button — always visible, high contrast */}
      <button
        onClick={handleClose}
        title="Dismiss for 1 day"
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          width: "22px",
          height: "22px",
          borderRadius: "0",
          backgroundColor: "#21262d",
          border: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#ffffffff",
          flexShrink: 0,
          zIndex: 31,
          transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#30363d"; e.currentTarget.style.color = "#e6edf3"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#21262d"; e.currentTarget.style.color = "#8b949e"; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-icon lucide-x">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {/* App Icon */}
      <img
        src="/depdok-app-icon.png"
        alt="Depdok Logo"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "0",
          objectFit: "cover",
          marginBottom: "10px",
        }}
      />

      {/* Title */}
      <h3 style={{
        margin: "0 0 6px 0",
        fontSize: "13px",
        fontWeight: 700,
        color: "#e6edf3",
        letterSpacing: "0.3px",
        textAlign: "center",
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}>
        Get Depdok
      </h3>

      <p style={{
        margin: "0 0 14px 0",
        fontSize: "11px",
        color: "#8b949e",
        lineHeight: "1.5",
        textAlign: "center",
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}>
        Lightweight, offline-first editor for developers. Supports PlantUML, Mermaid, Markdown &amp; Todo.
      </p>

      {/* CTA — WIRED: 2px black border, square, inverts on hover */}
      <a
        href="https://depdok.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          width: "100%",
          padding: "8px 0",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          borderRadius: "0",
          textDecoration: "none",
          textAlign: "center",
          border: "2px solid #ffffff",
          transition: "background 0.12s, color 0.12s",
          fontFamily: "'Inter','Helvetica Neue',sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#000000";
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
          e.currentTarget.style.color = "#000000";
        }}
      >
        Get it now
      </a>
    </div>
  );
}
