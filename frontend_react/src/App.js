import React, { useEffect } from 'react';
import './App.css';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './state/AuthContext';

import { ProtectedRoute } from './pages/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { GamePage } from './pages/GamePage';
import { ProfilePage } from './pages/ProfilePage';
import { HistoryPage } from './pages/HistoryPage';
import { LeaderboardsPage } from './pages/LeaderboardsPage';

function Navbar() {
  const { isAuthed, user, actions } = useAuth();
  const location = useLocation();

  return (
    <div className="navbar">
      <div className="navInner">
        <div className="brand">
          <Link to="/" className="brandLink">
            <span className="brandMark">♟</span>
            <span className="brandText">Chess Mastery</span>
          </Link>
        </div>

        <nav className="navLinks" aria-label="Primary navigation">
          <NavLink to="/" className={({ isActive }) => `navLink ${isActive ? 'navLinkActive' : ''}`} end>
            Play
          </NavLink>
          <NavLink to="/leaderboards" className={({ isActive }) => `navLink ${isActive ? 'navLinkActive' : ''}`}>
            Leaderboards
          </NavLink>
          {isAuthed ? (
            <NavLink to="/history" className={({ isActive }) => `navLink ${isActive ? 'navLinkActive' : ''}`}>
              History
            </NavLink>
          ) : null}
        </nav>

        <div className="navRight">
          {!isAuthed ? (
            <div className="rowGap">
              <Link to="/login" state={{ from: location }} className="navCta">
                Sign in
              </Link>
              <Link to="/register" className="navCta navCtaSecondary">
                Register
              </Link>
            </div>
          ) : (
            <div className="rowGap">
              <Link to="/profile" className="profileChip" aria-label="Open profile">
                <span className="avatar">{(user?.username || 'U')[0]?.toUpperCase()}</span>
                <span className="profileName">{user?.username}</span>
              </Link>
              <button className="navCta navCtaSecondary" onClick={actions.logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <div className="footerInner">
        <div className="muted">Chess Mastery Platform · REST-only (polling for updates; WebSockets disabled).</div>
        <div className="footerLinks">
          <a href="http://localhost:3001/docs" target="_blank" rel="noreferrer">
            API Docs
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            React
          </a>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/leaderboards" element={<LeaderboardsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<div className="pageCenter">Not found</div>} />
    </Routes>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Root app component: providers + shell + routing. */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="AppShell">
      <AuthProvider>
        <Navbar />
        <main className="content">
          <AppRoutes />
        </main>
        <Footer />
      </AuthProvider>
    </div>
  );
}

export default App;
