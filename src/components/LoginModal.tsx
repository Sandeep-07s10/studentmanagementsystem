/**
 * Authentication Modal: Login & Registration
 * Provides password complexity indicators, preset role logins (Admin, Faculty, Student),
 * and registration with bcrypt password hashing on the server.
 */

import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiRequest, setStoredTokens, DEFAULT_CREDENTIALS } from '../services/api.js';
import type { User as UserType } from '../types/index.js';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'FACULTY' | 'STUDENT'>('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { email, password, name, role } : { email, password };

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setStoredTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
      onSuccess(res.data.user);
      onClose();
    } catch (err: any) {
      if (err.details && Array.isArray(err.details)) {
        setError(err.details.map((d: any) => `${d.field}: ${d.issue}`).join(', '));
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (key: 'admin' | 'faculty' | 'student') => {
    setLoading(true);
    setError(null);
    const creds = DEFAULT_CREDENTIALS[key];

    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
      setStoredTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken, res.data.user);
      onSuccess(res.data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed quick login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">
            {isRegister ? 'Register University Identity' : 'Sign In to AcademiaSec'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick Demo Logins Strip */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-2">
              QUICK AUTHENTICATION SWITCHER
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-1.5 px-2 bg-white border border-slate-200 rounded font-medium text-slate-800 hover:bg-slate-100 text-[11px]"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('faculty')}
                className="py-1.5 px-2 bg-white border border-slate-200 rounded font-medium text-slate-800 hover:bg-slate-100 text-[11px]"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                className="py-1.5 px-2 bg-white border border-slate-200 rounded font-medium text-slate-800 hover:bg-slate-100 text-[11px]"
              >
                Student
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                  placeholder="Prof. Evelyn Reed"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-medium mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                placeholder="name@univ.edu"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Password {isRegister && <span className="text-[11px] text-slate-400">(min 8 chars, 1 uppercase, 1 symbol)</span>}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                placeholder="••••••••••••"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Register Identity' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-slate-600 hover:text-slate-900 text-xs font-medium underline"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register new user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
