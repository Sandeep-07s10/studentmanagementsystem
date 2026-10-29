/**
 * API Key Management & Validation Sandbox
 * Manages programmatic REST API credentials, SHA-256 storage hashing,
 * fine-grained scopes, rate limit allocations, and live key validation testing.
 */

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, CheckCircle2, AlertCircle, Copy, Check, ShieldCheck, Cpu } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import type { ApiKeyItem, User } from '../types/index.js';

interface ApiKeysViewProps {
  currentUser: User | null;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({ currentUser }) => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Academic Portal Sync Client',
    role: 'FACULTY',
    scopes: ['read:students', 'read:grades'],
    rateLimitPerMin: 120,
    expiryDays: 90,
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Key validation tester state
  const [candidateKey, setCandidateKey] = useState('sms_live_sec7729fa88019bd4901c274e119b98');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: ApiKeyItem[] }>('/api/api-keys');
      setKeys(res.data.data || []);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to load API keys', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setNewlyCreatedKey(res.data.apiKey.rawKey);
      fetchKeys();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Key creation failed', type: 'error' });
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke API key "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/api/api-keys/${id}`, { method: 'DELETE' });
      setFeedback({ message: `API Key "${name}" revoked.`, type: 'success' });
      fetchKeys();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Revocation failed', type: 'error' });
    }
  };

  const handleTestValidate = async () => {
    try {
      setValidationLoading(true);
      const res = await apiRequest('/api/api-keys/test-validate', {
        method: 'POST',
        body: JSON.stringify({ candidateKey }),
      });
      setValidationResult(res.data);
    } catch (err: any) {
      setValidationResult({ valid: false, error: err.message, status: err.status });
    } finally {
      setValidationLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              REST API Key Management & Validation
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Header: X-API-Key</span>
              <span aria-hidden="true">·</span>
              <span>Storage: SHA-256 Hash Digest</span>
              <span aria-hidden="true">·</span>
              <span>Rate Limiting: Sliding-window Throttling</span>
            </div>
          </div>
          <button
            onClick={() => {
              setNewlyCreatedKey(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New API Key</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Grid: Active API Keys Table & Validation Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keys List (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Active Cryptographic Keys</h3>
            <span className="text-xs text-slate-500">Only hashed digests stored in database</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Application / Key Prefix</th>
                  <th className="py-2.5 px-4">Role & Scopes</th>
                  <th className="py-2.5 px-4 text-right">Limit</th>
                  <th className="py-2.5 px-4 text-right">Usage</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Loading keys...</td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No API keys registered.</td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{k.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{k.keyPrefix}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-800 font-semibold">{k.role}</span>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-1 mt-0.5">
                          {k.scopes.slice(0, 3).join(', ')}
                          {k.scopes.length > 3 && ` +${k.scopes.length - 3}`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {k.rateLimitPerMin} /min
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {k.requestCount} reqs
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteKey(k.id, k.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Validation Sandbox (1 col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Key Validator Sandbox</h3>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Tests candidate key against server SHA-256 cryptographic hash database.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Candidate Raw API Key
              </label>
              <textarea
                rows={3}
                value={candidateKey}
                onChange={(e) => setCandidateKey(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-mono text-slate-900 break-all"
                placeholder="sms_live_..."
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                onClick={() => setCandidateKey('sms_live_sec7729fa88019bd4901c274e119b98')}
                className="text-slate-600 hover:text-slate-900 underline text-[11px]"
              >
                Insert Valid Key
              </button>
              <button
                onClick={() => setCandidateKey('sms_live_tampered_forged_key_00000000')}
                className="text-rose-600 hover:text-rose-800 underline text-[11px]"
              >
                Insert Invalid Key
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={handleTestValidate}
              disabled={validationLoading}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {validationLoading ? 'Verifying Digest...' : 'Verify Key Validity'}
            </button>

            {validationResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  validationResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{validationResult.valid ? 'Valid & Authorized' : 'Verification Denied'}</span>
                </div>
                <div className="mt-1 text-[11px] font-mono">
                  {validationResult.valid ? (
                    <>
                      <div>Name: {validationResult.keyDetails.name}</div>
                      <div>Role: {validationResult.keyDetails.role}</div>
                      <div>Limit: {validationResult.keyDetails.rateLimitPerMin} req/min</div>
                    </>
                  ) : (
                    <div>{validationResult.message || validationResult.error}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Generate New API Key */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 text-xs">
            {newlyCreatedKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">API Key Successfully Generated</h3>
                </div>
                <p className="text-slate-600">
                  Please copy your raw API key now. For security purposes, this secret key will <strong>never be shown again</strong>.
                </p>

                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all select-all flex items-center justify-between gap-2">
                  <span>{newlyCreatedKey}</span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800 shrink-0"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewlyCreatedKey(null);
                  }}
                  className="w-full py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  I Have Stored the Key Safely
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Issue Programmatic API Key</h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Application Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    placeholder="e.g. Student Portal Mobile App"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Authorized Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    >
                      <option value="FACULTY">FACULTY</option>
                      <option value="STUDENT">STUDENT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Rate Limit (req/min)</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={formData.rateLimitPerMin}
                      onChange={(e) => setFormData({ ...formData, rateLimitPerMin: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Expiration</label>
                  <select
                    value={formData.expiryDays}
                    onChange={(e) => setFormData({ ...formData, expiryDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
