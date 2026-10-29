/**
 * AcademiaSec Top Bar
 * Adheres strictly to the 3-zone Top Bar Contract:
 * [Wordmark] — [Nav Links: Students, Security, JWT, API Keys, Tests, REST API] — [Account & Role Switcher]
 */

import React from 'react';
import { Shield, UserCheck, Key, Terminal, Award, CheckCircle2, LogOut, ChevronDown, Download } from 'lucide-react';
import type { User } from '../types/index.js';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  authMode: 'JWT' | 'API_KEY';
  onSwitchAccount: (roleKey: 'admin' | 'faculty' | 'student') => void;
  onLogout: () => void;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  authMode,
  onSwitchAccount,
  onLogout,
  onOpenLoginModal,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const navLinks = [
    { id: 'students', label: 'Students' },
    { id: 'tests', label: 'Testing Results' },
    { id: 'jwt', label: 'JWT & Bcrypt' },
    { id: 'security', label: 'HTTPS & TLS' },
    { id: 'apikeys', label: 'API Keys' },
    { id: 'explorer', label: 'REST Explorer' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <button
            onClick={() => onSelectTab('students')}
            className="flex items-center gap-2.5 text-left text-slate-900 focus:outline-none whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              AS
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              AcademiaSec
            </span>
          </button>

          {/* Zone 2: Concise single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navLinks.map((link) => {
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onSelectTab(link.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-slate-900 font-semibold'
                      : 'hover:text-slate-900 text-slate-600'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action / Account Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="/api/download/project-zip"
              download="academiasec-student-management.zip"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Download Full Project ZIP Archive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Project ZIP</span>
            </a>
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-900">{currentUser.name.split(' ')[0]}</span>
                  <span className="text-slate-400">/</span>
                  <span className="font-mono text-[11px] text-slate-600">{currentUser.role}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 text-xs"
                    onMouseLeave={() => setRoleMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-slate-500 font-mono text-[11px] truncate">{currentUser.email}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Active Mode: <span className="font-mono text-slate-900 font-semibold">{authMode}</span>
                      </p>
                    </div>

                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                      SWITCH ACTIVE ROLE
                    </div>
                    <button
                      onClick={() => {
                        onSwitchAccount('admin');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Dr. Sarah Mitchell</div>
                        <div className="text-[11px] text-slate-500">ADMIN (Full Permissions)</div>
                      </div>
                      {currentUser.role === 'ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => {
                        onSwitchAccount('faculty');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Prof. David Chen</div>
                        <div className="text-[11px] text-slate-500">FACULTY (Grades & Students)</div>
                      </div>
                      {currentUser.role === 'FACULTY' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => {
                        onSwitchAccount('student');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Alex Vance</div>
                        <div className="text-[11px] text-slate-500">STUDENT (Restricted RBAC)</div>
                      </div>
                      {currentUser.role === 'STUDENT' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setRoleMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto py-2.5 border-t border-slate-100 no-scrollbar">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id)}
                className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 ${
                  isActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
