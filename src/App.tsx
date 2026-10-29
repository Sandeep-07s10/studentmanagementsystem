/**
 * AcademiaSec - Secure Student Management System
 * Full-Stack React Client Entry Point
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { StudentsView } from './components/StudentsView.js';
import { TestingResultsView } from './components/TestingResultsView.js';
import { AuthJwtInspector } from './components/AuthJwtInspector.js';
import { SecurityPostureView } from './components/SecurityPostureView.js';
import { ApiKeysView } from './components/ApiKeysView.js';
import { RestApiExplorer } from './components/RestApiExplorer.js';
import { LoginModal } from './components/LoginModal.js';
import {
  apiRequest,
  getStoredToken,
  setStoredTokens,
  clearAuth,
  getAuthMode,
  setAuthMode,
  DEFAULT_CREDENTIALS,
} from './services/api.js';
import type { User } from './types/index.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState('students');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthModeState] = useState<'JWT' | 'API_KEY'>(getAuthMode());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize Auth: Auto login as default admin if no valid token
  const initAuth = async () => {
    const existingToken = getStoredToken();
    if (existingToken) {
      try {
        const res = await apiRequest('/api/auth/me');
        setCurrentUser(res.data.user);
        setInitialLoading(false);
        return;
      } catch (err) {
        clearAuth();
      }
    }

    // Auto login as default Admin (Dr. Sarah Mitchell) for immediate evaluation
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: DEFAULT_CREDENTIALS.admin.email,
          password: DEFAULT_CREDENTIALS.admin.password,
        }),
      });
      setStoredTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
      setCurrentUser(res.data.user);
    } catch (err) {
      console.warn('Initial auto-login could not complete:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const handleSwitchAccount = async (roleKey: 'admin' | 'faculty' | 'student') => {
    const creds = DEFAULT_CREDENTIALS[roleKey];
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
      setStoredTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
      setCurrentUser(res.data.user);
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        authMode={authMode}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {initialLoading ? (
          <div className="py-24 text-center text-slate-400 text-xs">
            Connecting to secure backend & initializing cryptographic state...
          </div>
        ) : (
          <>
            {currentTab === 'students' && (
              <StudentsView
                currentUser={currentUser}
                onNavigateToTests={() => setCurrentTab('tests')}
              />
            )}
            {currentTab === 'tests' && <TestingResultsView />}
            {currentTab === 'jwt' && (
              <AuthJwtInspector
                currentUser={currentUser}
                onRefreshUser={initAuth}
              />
            )}
            {currentTab === 'security' && <SecurityPostureView />}
            {currentTab === 'apikeys' && <ApiKeysView currentUser={currentUser} />}
            {currentTab === 'explorer' && <RestApiExplorer />}
          </>
        )}
      </main>

      {/* Quiet, Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">AcademiaSec</span>
            <span aria-hidden="true">·</span>
            <span>REST API & Student Information Security Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>RFC 7519 (JWT)</span>
            <span aria-hidden="true">·</span>
            <span>RFC 8446 (TLS 1.3)</span>
            <span aria-hidden="true">·</span>
            <span>RFC 6797 (HSTS)</span>
            <span aria-hidden="true">·</span>
            <span>Blowfish Bcrypt KDF</span>
          </div>
        </div>
      </footer>

      {/* Login & Registration Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
