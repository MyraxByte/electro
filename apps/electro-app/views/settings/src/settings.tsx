import React from "react";
import ReactDOM from "react-dom/client";

function Settings() {
    return (
        <div style={{ padding: "24px", height: "100%" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em" }}>⚙️ Settings</h1>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                    Monorepo view — <code>@emono/view-settings</code>
                </p>
            </header>

            <section style={sectionStyle}>
                <h2 style={headingStyle}>About</h2>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>App</span>
                    <span>ElectroJS Mono App</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>Pattern</span>
                    <span>Monorepo (recommended)</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>Runtime pkg</span>
                    <code style={{ fontSize: "12px" }}>@emono/runtime</code>
                </div>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>This view</span>
                    <code style={{ fontSize: "12px" }}>@emono/view-settings</code>
                </div>
            </section>

            <section style={sectionStyle}>
                <h2 style={headingStyle}>Dev Mode</h2>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>Vite mode</span>
                    <span>Separate server per view</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ color: "#888" }}>This view port</span>
                    <span>{window.location.port || "—"}</span>
                </div>
            </section>
        </div>
    );
}

const sectionStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    marginBottom: "16px",
    padding: "16px",
};

const headingStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "12px",
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    padding: "6px 0",
    borderBottom: "1px solid #1f1f1f",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Settings />
    </React.StrictMode>,
);
