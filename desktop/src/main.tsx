import "@keybr/themes/lib/index.less";
import "./desktop.css";
import { ErrorHandler } from "@keybr/debug";
import { loadIntl } from "@keybr/intl";
import { KeyboardProvider } from "@keybr/keyboard";
import { PageDataContext, type PageData } from "@keybr/pages-shared";
import { ResultLoader } from "@keybr/result-loader";
import { SettingsLoader } from "@keybr/settings-loader";
import { PortalContainer } from "@keybr/widget";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RawIntlProvider } from "react-intl";
import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router";
import { BackupPage } from "./BackupPage.tsx";
import { DesktopThemeProvider, ThemeControls } from "./theme.tsx";

const Practice = lazy(() => import("@keybr/page-practice").then((m) => ({ default: m.PracticePage })));
const Profile = lazy(() => import("@keybr/page-profile").then((m) => ({ default: m.ProfilePage })));
const TypingTest = lazy(() => import("@keybr/page-typing-test").then((m) => ({ default: m.TypingTestPage })));
const Help = lazy(() => import("@keybr/page-help").then((m) => ({ default: m.HelpPage })));

export async function main() {
  const intl = await loadIntl("en");
  const pageData: PageData = {
    base: new URL("./", window.location.href).href,
    locale: "en",
    user: null,
    publicUser: { id: null, name: "Local user", imageUrl: null },
    settings: null,
  };
  const root = document.getElementById("desktop-root");
  if (!root) throw new Error("Missing desktop root");
  // The website's server-rendered shell creates this before React starts.
  // Portals query it during render, so a React sibling would be too late.
  if (!document.getElementById(PortalContainer.id)) {
    const portal = document.createElement("div");
    portal.id = PortalContainer.id;
    document.body.append(portal);
  }
  createRoot(root).render(
    <PageDataContext.Provider value={pageData}>
      <ErrorHandler>
        <RawIntlProvider value={intl}>
          <HashRouter>
            <SettingsLoader>
              <DesktopThemeProvider>
                <ResultLoader><Desktop /></ResultLoader>
              </DesktopThemeProvider>
            </SettingsLoader>
          </HashRouter>
        </RawIntlProvider>
      </ErrorHandler>
    </PageDataContext.Provider>,
  );
}

function Desktop() {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const notify = () => setNotice("That link requires an online service. This app stays offline; use Backup to move your data.");
    window.addEventListener("desktop-offline-link", notify);
    return () => window.removeEventListener("desktop-offline-link", notify);
  }, []);
  return (
    <div className="desktop-shell" data-testid="desktop-ready">
      <header className="desktop-header">
        <strong>Keybr Desktop <small>offline</small></strong>
        <nav aria-label="Desktop pages">
          <NavLink to="/" end>Practice</NavLink>
          <NavLink to="/profile">Statistics</NavLink>
          <NavLink to="/typing-test">Typing test</NavLink>
          <NavLink to="/help">Help</NavLink>
          <NavLink to="/backup">Backup &amp; about</NavLink>
        </nav>
        <ThemeControls />
      </header>
      {notice && <aside className="desktop-notice" role="status">{notice} <button onClick={() => setNotice("")}>Dismiss</button></aside>}
      <main className="desktop-main" id="desktop-workspace">
        <Suspense fallback={<p role="status">Loading bundled page…</p>}>
          <Routes>
            <Route path="/" element={<section data-testid="practice-page"><Practice /></section>} />
            <Route path="/profile" element={<section data-testid="profile-page"><Profile /></section>} />
            <Route path="/typing-test" element={<KeyboardProvider><section data-testid="typing-test-page"><TypingTest /></section></KeyboardProvider>} />
            <Route path="/help" element={<section data-testid="help-page"><Help /></section>} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="desktop-footer">Progress is stored on this device. No account, cloud sync, ads, or analytics.</footer>
    </div>
  );
}
