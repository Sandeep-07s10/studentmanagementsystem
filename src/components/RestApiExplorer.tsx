/**
 * Interactive REST API Client & Sandbox
 * Enables manual and automated exploratory testing of all Student Management endpoints,
 * with live headers inspection, status codes, and JSON formatting.
 */

import React, { useState } from 'react';
import { Send, Terminal, Play, CheckCircle2, AlertCircle, Copy, Check, Clock } from 'lucide-react';
import { getStoredToken, getStoredApiKey } from '../services/api.js';

interface EndpointPreset {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  body?: any;
  requiresAuth: boolean;
}

export const RestApiExplorer: React.FC = () => {
  const PRESETS: EndpointPreset[] = [
    {
      name: 'List Students (Query & Filter)',
      method: 'GET',
      path: '/api/students?limit=5',
      description: 'Fetch paginated student directory with active filters',
      requiresAuth: true,
    },
    {
      name: 'Get Student Transcript (RBAC protected)',
      method: 'GET',
      path: '/api/courses/transcript/STU-10021',
      description: 'Fetch official student grades and calculated GPA',
      requiresAuth: true,
    },
    {
      name: 'Create Student (Schema Validation)',
      method: 'POST',
      path: '/api/students',
      description: 'Register student record with rigorous validation boundaries',
      body: {
        firstName: 'Marcus',
        lastName: 'Aurelius',
        email: 'm.aurelius@univ.edu',
        major: 'Philosophy & Computing',
        department: 'School of Humanities',
        gpa: 3.85,
        creditsEarned: 60,
        enrollmentYear: 2024,
        status: 'ACTIVE',
      },
      requiresAuth: true,
    },
    {
      name: 'Trigger Validation Error (Negative GPA & Invalid Email)',
      method: 'POST',
      path: '/api/students',
      description: 'Deliberately send malformed data to observe 400 Bad Request schema details',
      body: {
        firstName: '',
        lastName: 'Invalid',
        email: 'not-an-email',
        gpa: -2.5,
        major: 'Security',
      },
      requiresAuth: true,
    },
    {
      name: 'Delete Student (Admin RBAC Only)',
      method: 'DELETE',
      path: '/api/students/stu_06',
      description: 'Attempts deletion. Blocks non-admin callers with 403 Forbidden',
      requiresAuth: true,
    },
    {
      name: 'Record Course Grade',
      method: 'POST',
      path: '/api/courses/grades',
      description: 'Assign letter grade and auto-recalculate student cumulative GPA',
      body: {
        studentId: 'STU-10021',
        courseId: 'CS-401',
        grade: 'A',
        numericGrade: 95,
        attendanceRate: 98,
      },
      requiresAuth: true,
    },
    {
      name: 'Security Posture & TLS Audit',
      method: 'GET',
      path: '/api/security/posture',
      description: 'Inspect live HSTS, TLS cipher, and defensive headers',
      requiresAuth: false,
    },
    {
      name: 'Run Automated Test Suite',
      method: 'POST',
      path: '/api/tests/run',
      description: 'Trigger full backend verification test runner',
      requiresAuth: false,
    },
  ];

  const [selectedPreset, setSelectedPreset] = useState<EndpointPreset>(PRESETS[0]);
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>(PRESETS[0].method);
  const [path, setPath] = useState<string>(PRESETS[0].path);
  const [requestBody, setRequestBody] = useState<string>('');
  const [authHeaderType, setAuthHeaderType] = useState<'BEARER_JWT' | 'API_KEY' | 'NONE'>('BEARER_JWT');

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Array<[string, string]>>([]);
  const [responseBody, setResponseBody] = useState<any>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectPreset = (preset: EndpointPreset) => {
    setSelectedPreset(preset);
    setMethod(preset.method);
    setPath(preset.path);
    setRequestBody(preset.body ? JSON.stringify(preset.body, null, 2) : '');
  };

  const handleExecuteRequest = async () => {
    setExecuting(true);
    setResponseStatus(null);
    setResponseBody(null);
    setResponseHeaders([]);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authHeaderType === 'BEARER_JWT') {
        const token = getStoredToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } else if (authHeaderType === 'API_KEY') {
        const apiKey = getStoredApiKey();
        if (apiKey) headers['X-API-Key'] = apiKey;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (method !== 'GET' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(path, options);
      const elapsed = Math.round((performance.now() - start) * 10) / 10;
      setDurationMs(elapsed);
      setResponseStatus(res.status);

      const headerPairs: Array<[string, string]> = [];
      res.headers.forEach((value, key) => {
        headerPairs.push([key, value]);
      });
      setResponseHeaders(headerPairs);

      const text = await res.text();
      try {
        setResponseBody(JSON.parse(text));
      } catch {
        setResponseBody(text);
      }
    } catch (err: any) {
      setDurationMs(Math.round((performance.now() - start) * 10) / 10);
      setResponseStatus(500);
      setResponseBody({ error: err.message || 'Network error' });
    } finally {
      setExecuting(false);
    }
  };

  const copyResponse = () => {
    if (!responseBody) return;
    navigator.clipboard.writeText(JSON.stringify(responseBody, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Interactive REST API Sandbox
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          <span>Protocol: HTTP/1.1 & HTTPS</span>
          <span aria-hidden="true">·</span>
          <span>Authentication: Bearer JWT / X-API-Key</span>
          <span aria-hidden="true">·</span>
          <span>Full Payload & Headers Visibility</span>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <span className="text-xs font-semibold text-slate-600 block mb-2">QUICK ENDPOINT PRESETS</span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
                selectedPreset.name === p.name
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <strong className="font-mono mr-1.5">{p.method}</strong>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Request Configurator & Response Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Side */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">HTTP Request Builder</h3>
            <span className="text-xs text-slate-500">{selectedPreset.description}</span>
          </div>

          {/* URL bar */}
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
            />
            <button
              onClick={handleExecuteRequest}
              disabled={executing}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{executing ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          {/* Auth Header Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Authorization Mode</label>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="authMode"
                  checked={authHeaderType === 'BEARER_JWT'}
                  onChange={() => setAuthHeaderType('BEARER_JWT')}
                />
                <span>Bearer JWT (Current User)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="authMode"
                  checked={authHeaderType === 'API_KEY'}
                  onChange={() => setAuthHeaderType('API_KEY')}
                />
                <span>X-API-Key</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="authMode"
                  checked={authHeaderType === 'NONE'}
                  onChange={() => setAuthHeaderType('NONE')}
                />
                <span>Anonymous (No Auth)</span>
              </label>
            </div>
          </div>

          {/* JSON Body */}
          {method !== 'GET' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                JSON Request Body (application/json)
              </label>
              <textarea
                rows={8}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-slate-50 text-slate-900"
                placeholder='{ "key": "value" }'
              />
            </div>
          )}
        </div>

        {/* Response Side */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Server Response</h3>
                {responseStatus && (
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-50 text-emerald-700'
                        : responseStatus === 400
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
                {durationMs !== null && (
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {durationMs} ms
                  </span>
                )}
              </div>

              {responseBody && (
                <button
                  onClick={copyResponse}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  title="Copy JSON Response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Enforced Security Headers Preview */}
            {responseHeaders.length > 0 && (
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono space-y-0.5 text-slate-600 max-h-28 overflow-y-auto">
                <div className="font-sans font-semibold text-slate-800 text-[11px] mb-1">
                  Enforced Security & Transport Headers:
                </div>
                {responseHeaders
                  .filter(([k]) =>
                    ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'x-ratelimit-remaining'].includes(
                      k.toLowerCase()
                    )
                  )
                  .map(([k, v], i) => (
                    <div key={i}>
                      <strong className="text-slate-800">{k}:</strong> {v}
                    </div>
                  ))}
              </div>
            )}

            {/* Formatted JSON Body */}
            <div className="mt-3">
              <pre className="font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto max-h-96">
                {responseBody ? JSON.stringify(responseBody, null, 2) : '// Send request to inspect server output'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
