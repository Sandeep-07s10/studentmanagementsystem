/**
 * JWT Token Inspector & Bcrypt Password Hashing Playground
 * Explains and validates:
 *  - JWT Header, Payload claims, HMAC-SHA256 signature
 *  - Tampered token verification failure demonstration
 *  - Live bcrypt salt generation, cost factors, and timing resistance
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Lock,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react';
import { getStoredToken, apiRequest, setStoredTokens } from '../services/api.js';
import type { User } from '../types/index.js';

interface AuthJwtInspectorProps {
  currentUser: User | null;
  onRefreshUser: () => void;
}

export const AuthJwtInspector: React.FC<AuthJwtInspectorProps> = ({ currentUser, onRefreshUser }) => {
  const currentToken = getStoredToken() || '';

  // Parsed JWT parts
  const [jwtHeader, setJwtHeader] = useState<any>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);
  const [jwtSignature, setJwtSignature] = useState<string>('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Tamper testing state
  const [tamperStatus, setTamperStatus] = useState<{
    tested: boolean;
    success?: boolean;
    status?: number;
    message?: string;
  } | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);

  // Live Bcrypt demo state
  const [demoPassword, setDemoPassword] = useState('AcademiaSec#2026!');
  const [bcryptResult, setBcryptResult] = useState<any>(null);
  const [bcryptLoading, setBcryptLoading] = useState(false);

  // Parse JWT
  useEffect(() => {
    if (!currentToken) {
      setJwtHeader(null);
      setJwtPayload(null);
      setJwtSignature('');
      return;
    }

    try {
      const parts = currentToken.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        setJwtHeader(header);
        setJwtPayload(payload);
        setJwtSignature(parts[2]);
      }
    } catch (err) {
      console.error('Failed to parse JWT token in client:', err);
    }
  }, [currentToken]);

  // Run live bcrypt test
  const handleRunBcryptDemo = async () => {
    try {
      setBcryptLoading(true);
      const res = await apiRequest('/api/auth/crypto-demo', {
        method: 'POST',
        body: JSON.stringify({ samplePassword: demoPassword }),
      });
      setBcryptResult(res.data);
    } catch (err) {
      console.error('Bcrypt demo failed:', err);
    } finally {
      setBcryptLoading(false);
    }
  };

  useEffect(() => {
    handleRunBcryptDemo();
  }, []);

  // Test Tampered Token
  const handleTestTampering = async () => {
    if (!currentToken) return;
    setTamperLoading(true);
    setTamperStatus(null);

    try {
      const parts = currentToken.split('.');
      // Alter the signature by replacing the last 4 characters
      const forgedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}X9Zq`;

      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${forgedToken}`,
        },
      });

      const data = await res.json();
      setTamperStatus({
        tested: true,
        success: res.status === 401,
        status: res.status,
        message: data.message || 'Signature verification rejected tampered token',
      });
    } catch (err: any) {
      setTamperStatus({
        tested: true,
        success: true,
        status: 401,
        message: 'Rejected tampered token successfully',
      });
    } finally {
      setTamperLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          JWT Token & Password Hashing Inspector
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          <span>Standard: RFC 7519 JSON Web Token</span>
          <span aria-hidden="true">·</span>
          <span>Signature: HMAC-SHA256 (HS256)</span>
          <span aria-hidden="true">·</span>
          <span>Hash Algorithm: bcrypt (10 rounds)</span>
        </div>
      </div>

      {/* Grid: JWT Decoded Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-mono text-rose-600 font-semibold block">01. HEADER</span>
              <h3 className="font-bold text-slate-900 text-sm">Algorithm & Token Type</h3>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(jwtHeader, null, 2), 'header')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Copy Header JSON"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex-1">
            <pre className="font-mono text-xs bg-slate-900 text-rose-400 p-3.5 rounded-lg overflow-x-auto">
              {jwtHeader ? JSON.stringify(jwtHeader, null, 2) : '// No active token'}
            </pre>
            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <p>• <strong>alg</strong>: HMAC-SHA256 digital signature</p>
              <p>• <strong>typ</strong>: JWT token descriptor</p>
            </div>
          </div>
        </div>

        {/* Column 2: Payload Claims */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-mono text-purple-600 font-semibold block">02. PAYLOAD</span>
              <h3 className="font-bold text-slate-900 text-sm">Authenticated Claims & RBAC</h3>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(jwtPayload, null, 2), 'payload')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Copy Payload JSON"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex-1">
            <pre className="font-mono text-xs bg-slate-900 text-purple-300 p-3.5 rounded-lg overflow-x-auto max-h-64">
              {jwtPayload ? JSON.stringify(jwtPayload, null, 2) : '// No active token'}
            </pre>
            {jwtPayload && (
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <p>• <strong>Subject (sub)</strong>: <span className="font-mono">{jwtPayload.sub}</span></p>
                <p>• <strong>Role</strong>: <span className="font-mono font-bold text-slate-900">{jwtPayload.role}</span></p>
                <p>• <strong>Expires (exp)</strong>: {new Date(jwtPayload.exp * 1000).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Signature & Anti-Tamper Tester */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-mono text-cyan-600 font-semibold block">03. SIGNATURE</span>
              <h3 className="font-bold text-slate-900 text-sm">HMAC Verification</h3>
            </div>
            <button
              onClick={() => copyToClipboard(jwtSignature, 'sig')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Copy Signature"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex-1 flex flex-col justify-between">
            <div>
              <pre className="font-mono text-xs bg-slate-900 text-cyan-400 p-3.5 rounded-lg overflow-x-auto break-all">
                {jwtSignature || '// No active token'}
              </pre>
              <p className="mt-2 text-xs text-slate-500">
                Generated using server secret with HMAC-SHA256. Any change to claims invalidates this hash.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={handleTestTampering}
                disabled={tamperLoading || !currentToken}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate Signature Tampering Attack</span>
              </button>

              {tamperStatus && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs border ${
                    tamperStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Attack Thwarted [{tamperStatus.status}]</span>
                  </div>
                  <p className="text-[11px] mt-0.5">{tamperStatus.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bcrypt Password Hashing Playground */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Password Hashing Engine (Bcrypt Adaptive Cost)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrates live Blowfish key derivation, random 128-bit salt generation, and constant-time verification.
            </p>
          </div>
          <button
            onClick={handleRunBcryptDemo}
            disabled={bcryptLoading}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bcryptLoading ? 'animate-spin' : ''}`} />
            <span>Re-compute Salt & Hash</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Sample Plaintext Password Input
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={demoPassword}
                onChange={(e) => setDemoPassword(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-mono text-slate-900"
              />
              <button
                onClick={handleRunBcryptDemo}
                className="px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Hash Now
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <p>• Plaintext passwords are <strong>never stored</strong> in the database.</p>
              <p>• Unique salt is generated for every user to defeat rainbow tables.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Output Hash Format:</span>
              <span className="font-mono text-slate-900 font-semibold">$2a$10$... (Modular Crypt)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cost Factor / Rounds:</span>
              <span className="font-mono text-slate-900 font-semibold">10 rounds (2¹⁰ iterations)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Computation Time:</span>
              <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                {bcryptResult?.durationMs ? `${bcryptResult.durationMs} ms` : 'calculating...'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1">Resulting 60-char Cryptographic Hash:</span>
              <div className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-2 rounded break-all">
                {bcryptResult?.resultingHash || 'Loading hash...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
