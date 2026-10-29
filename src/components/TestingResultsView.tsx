/**
 * Automated Testing Suite & Results Dashboard
 * Delivers comprehensive verification results for:
 *  - Authentication & Bcrypt hashing
 *  - JWT signature & anti-tampering
 *  - Role-Based Access Control (RBAC) privilege enforcement
 *  - API Key SHA-256 validation
 *  - Schema input boundaries & regex
 *  - HTTPS / TLS defensive security headers
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import type { TestResultItem, TestSummary } from '../types/index.js';

export const TestingResultsView: React.FC = () => {
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [results, setResults] = useState<TestResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const runAllTests = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ summary: TestSummary; results: TestResultItem[] }>('/api/tests/run', {
        method: 'POST',
      });
      setSummary(res.data.summary);
      setResults(res.data.results);
      if (res.data.results.length > 0) {
        setExpandedTestId(res.data.results[0].id);
      }
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const categories = [
    'ALL',
    'AUTHENTICATION',
    'AUTHORIZATION',
    'JWT',
    'API_KEYS',
    'PASSWORD_HASHING',
    'INPUT_VALIDATION',
    'HTTPS_SECURITY',
  ];

  const filteredResults = results.filter((r) => {
    if (filterCategory === 'ALL') return true;
    return r.category === filterCategory;
  });

  const exportMarkdownReport = () => {
    if (!summary) return;

    let md = `# AcademiaSec - Official Automated Security & API Testing Report\n`;
    md += `**Execution Date**: ${summary.executedAt}\n`;
    md += `**Total Tests**: ${summary.totalTests} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed} | **Pass Rate**: ${summary.passRate}\n`;
    md += `**Execution Time**: ${summary.totalDurationMs} ms\n\n`;
    md += `## Detailed Test Execution Assertions\n\n`;
    md += `| Test ID | Category | Name | Duration | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    results.forEach((r) => {
      md += `| \`${r.id}\` | ${r.category} | ${r.name} | ${r.durationMs}ms | ${r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'} |\n`;
    });

    md += `\n### Test Assertions & Invariants\n\n`;
    results.forEach((r) => {
      md += `#### [${r.id}] ${r.name}\n`;
      md += `- **Assertion**: ${r.assertion}\n`;
      md += `- **Status**: ${r.status}\n`;
      md += `- **Expected**: \`${JSON.stringify(r.expected)}\`\n`;
      md += `- **Actual**: \`${JSON.stringify(r.actual)}\`\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const downloadJsonReport = () => {
    if (!summary) return;
    const reportData = {
      project: 'AcademiaSec Student Management System',
      summary,
      results,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academiasec-testing-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Action Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Automated Security & API Testing Results
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Full Test Suite Coverage: 8 Security Dimensions</span>
              <span aria-hidden="true">·</span>
              <span>Backend Integration: Live Express Server HTTP Requests</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportMarkdownReport}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Copy Markdown Test Report"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copied Markdown' : 'Copy Report'}</span>
            </button>

            <button
              onClick={downloadJsonReport}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Download JSON Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <a
              href="/api/download/project-zip"
              download="academiasec-student-management.zip"
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Download Full Project Source Code Archive (.zip)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Download Project ZIP</span>
            </a>

            <button
              onClick={runAllTests}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Executing Suite...' : 'Run All Tests'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        {summary && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">TOTAL TEST CASES</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">{summary.totalTests} Tests</span>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
              <span className="text-emerald-700 block text-[11px] font-medium">PASSED ASSERTIONS</span>
              <span className="text-base font-bold text-emerald-800 font-mono tabular-nums">{summary.passed} Passing</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">FAILED ASSERTIONS</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">{summary.failed} Failed</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">TOTAL DURATION</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">{summary.totalDurationMs} ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filterCategory === cat
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat === 'ALL' ? 'All Assertions' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tests Results List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
        {filteredResults.map((test) => {
          const isExpanded = expandedTestId === test.id;
          return (
            <div key={test.id} className="transition-colors hover:bg-slate-50/50">
              <div
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {test.status === 'PASSED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{test.id}</span>
                      <span className="font-semibold text-xs text-slate-900">{test.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-slate-400">{test.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{test.assertion}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono tabular-nums text-xs text-slate-500">
                    {test.durationMs} ms
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                      test.status === 'PASSED'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-rose-700 bg-rose-50'
                    }`}
                  >
                    {test.status}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Assertion Details */}
              {isExpanded && (
                <div className="px-6 pb-5 pt-1 text-xs border-t border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">
                        EXPECTED BEHAVIOR / INVARIANT
                      </span>
                      <pre className="font-mono text-slate-900 bg-slate-50 p-2 rounded text-[11px] overflow-x-auto">
                        {JSON.stringify(test.expected, null, 2)}
                      </pre>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">
                        ACTUAL SERVER RESPONSE / RESULT
                      </span>
                      <pre className="font-mono text-emerald-700 bg-slate-50 p-2 rounded text-[11px] overflow-x-auto font-medium">
                        {JSON.stringify(test.actual, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {test.responsePayload && (
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                      <div className="text-slate-400 mb-1 font-sans text-xs font-semibold">
                        Server Payload Trace:
                      </div>
                      <pre className="text-emerald-400">
                        {JSON.stringify(test.responsePayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
