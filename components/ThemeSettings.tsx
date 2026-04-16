"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AppTheme } from "@/lib/theme";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export default function ThemeSettings() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<AppTheme>(() => {
    // Initialize from storage — runs once on mount, no effect needed
    const stored = getStoredTheme();
    return stored ?? "light";
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Apply the theme to the DOM on mount (external system update, not setState)
    applyTheme(current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = useCallback((t: AppTheme) => {
    applyTheme(t);
    setCurrent(t);
    setOpen(false);
  }, []);

  return (
    <div className="theme-settings-wrap" ref={panelRef}>
      <button
        type="button"
        className="btn-theme-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Theme settings"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        <span>Theme</span>
      </button>
      {open && (
        <div className="theme-settings-panel" role="menu">
          <div className="theme-settings-title">Appearance</div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={current === "light"}
            className={`theme-option ${current === "light" ? "active" : ""}`}
            onClick={() => choose("light")}
          >
            <span className="theme-option-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
            </span>
            <span>
              <span className="theme-option-label">Light</span>
              <span className="theme-option-desc">White background</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={current === "dark"}
            className={`theme-option ${current === "dark" ? "active" : ""}`}
            onClick={() => choose("dark")}
          >
            <span className="theme-option-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            </span>
            <span>
              <span className="theme-option-label">Dark</span>
              <span className="theme-option-desc">Dark background</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
