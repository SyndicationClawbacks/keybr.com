import { ErrorHandler } from "@keybr/debug";
import { loadIntl } from "@keybr/intl";
import { KeyboardProvider } from "@keybr/keyboard";
import { type PageData, PageDataContext } from "@keybr/pages-shared";
import { ResultLoader } from "@keybr/result-loader";
import { SettingsLoader } from "@keybr/settings-loader";
import { PortalContainer, Toaster } from "@keybr/widget";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RawIntlProvider } from "react-intl";
import { HashRouter, Navigate, NavLink, Route, Routes } from "react-router";
import appIcon from "../icon.svg";
import { BackupPage } from "./BackupPage.tsx";
import { ProfileFooter } from "./ProfileFooter.tsx";
import {
  DesktopThemeProvider,
  initializeDesktopTheme,
  ThemeControls,
} from "./theme.tsx";
import { installTypingFocus } from "./typing-focus.mjs";

const Practice = lazy(() =>
  import("@keybr/page-practice").then((m) => ({ default: m.PracticePage })),
);
const Profile = lazy(() =>
  import("@keybr/page-profile").then((m) => ({ default: m.ProfilePage })),
);
const TypingTest = lazy(() =>
  import("@keybr/page-typing-test").then((m) => ({
    default: m.TypingTestPage,
  })),
);
const Help = lazy(() =>
  import("@keybr/page-help").then((m) => ({ default: m.HelpPage })),
);

export async function main() {
  initializeDesktopTheme();
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
                <ResultLoader>
                  <Desktop />
                </ResultLoader>
              </DesktopThemeProvider>
            </SettingsLoader>
          </HashRouter>
        </RawIntlProvider>
      </ErrorHandler>
    </PageDataContext.Provider>,
  );
}

function Desktop() {
  const workspaceRef = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) return installTypingFocus(workspace);
  }, []);
  useEffect(() => {
    const notify = () =>
      setNotice(
        "That link requires an online service. This app stays offline; use Backup to move your data.",
      );
    window.addEventListener("desktop-offline-link", notify);
    return () => window.removeEventListener("desktop-offline-link", notify);
  }, []);
  return (
    <div className="desktop-shell" data-testid="desktop-ready">
      <header className="desktop-header">
        <NavLink
          className="desktop-brand"
          to="/"
          aria-label="Keybr Desktop practice"
        >
          <img src={appIcon} width="42" height="42" alt="" />
          <span>
            KEYBR
            <span className="desktop-brand-caption">
              PERSONAL TYPING COMPUTER
            </span>
          </span>
        </NavLink>
        <nav aria-label="Desktop pages">
          <NavLink to="/" end={true}>
            Practice
          </NavLink>
          <NavLink to="/profile">Statistics</NavLink>
          <NavLink to="/typing-test">Typing test</NavLink>
          <NavLink to="/help">Help</NavLink>
          <NavLink to="/backup">Backup &amp; about</NavLink>
        </nav>
        <ThemeControls />
      </header>
      {notice && (
        <aside className="desktop-notice" role="status">
          {notice} <button onClick={() => setNotice("")}>Dismiss</button>
        </aside>
      )}
      <main ref={workspaceRef} className="desktop-main" id="desktop-workspace">
        <Suspense fallback={<p role="status">Loading bundled page…</p>}>
          <Routes>
            <Route
              path="/"
              element={
                <section
                  data-desktop-typing-page=""
                  data-testid="practice-page"
                >
                  <Practice />
                </section>
              }
            />
            <Route
              path="/profile"
              element={
                <section data-testid="profile-page">
                  <Profile footer={<ProfileFooter />} />
                </section>
              }
            />
            <Route
              path="/typing-test"
              element={
                <KeyboardProvider>
                  <section
                    data-desktop-typing-page=""
                    data-testid="typing-test-page"
                  >
                    <TypingTest />
                  </section>
                </KeyboardProvider>
              }
            />
            <Route
              path="/help"
              element={
                <section data-testid="help-page">
                  <Help />
                </section>
              }
            />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="*" element={<Navigate to="/" replace={true} />} />
          </Routes>
        </Suspense>
      </main>
      <Toaster />
      <footer className="desktop-footer">
        <span className="desktop-local-dot" /> All yours. All offline.
        <span>Progress saved on this device</span>
      </footer>
    </div>
  );
}
