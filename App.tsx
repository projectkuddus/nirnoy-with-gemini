import React from "react";

export function DebugApp() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #020617, #0f172a)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: 700 }}>Nirnoy Frontend OK ✅</h1>
      <p style={{ opacity: 0.8 }}>
        This is a debug screen; it proves React and Vite are rendering correctly.
      </p>
    </div>
  );
}

// Keep exporting DebugApp as the default so index.tsx can render it.
export default DebugApp;

// Re-export the preserved Gemini UI so it is easy to switch back later.
export { default as GeminiApp } from "./GeminiApp";
