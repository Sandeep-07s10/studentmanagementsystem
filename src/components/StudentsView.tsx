/**
 * Students Directory & Management Component
 * Implements high-density data grid, search, status filtering, Add/Edit modals
 * with server-side input validation, and RBAC permission enforcement.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  User,
  GraduationCap,
  BookOpen,
  Trash2,
  Edit2,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import type { Student, User as UserType } from '../types/index.js';

interface StudentsViewProps {
  currentUser: UserType | null;
  onNavigateToTests: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ currentUser, onNavigateToTests }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    id: '',
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    major: '',
    department: 'School of Engineering',
    gpa: '3.75',
    creditsEarned: '45',
    enrollmentYear: '2024',
    status: 'ACTIVE',
    advisor: 'Dr. Sarah Mitchell',
    phone: '+1 (555) 300-1234',
  });
  const [formErrors, setFormErrors] = useState<Array<{ field: string; issue: string }>>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // RBAC feedback notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; code?: number } | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);

      const res = await apiRequest<{ data: Student[] }>(`/api/students?${queryParams.toString()}`);
      setStudents(res.data.data || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load students',
        code: err.status,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      id: '',
      studentId: '',
      firstName: '',
      lastName: '',
      email: '',
      major: '',
      department: 'School of Engineering',
      gpa: '3.50',
      creditsEarned: '30',
      enrollmentYear: '2024',
      status: 'ACTIVE',
      advisor: 'Prof. David Chen',
      phone: '+1 (555) 444-5555',
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stu: Student) => {
    setModalMode('edit');
    setFormData({
      id: stu.id,
      studentId: stu.studentId,
      firstName: stu.firstName,
      lastName: stu.lastName,
      email: stu.email,
      major: stu.major,
      department: stu.department,
      gpa: stu.gpa.toString(),
      creditsEarned: stu.creditsEarned.toString(),
      enrollmentYear: stu.enrollmentYear.toString(),
      status: stu.status,
      advisor: stu.advisor,
      phone: stu.phone,
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormErrors([]);

    try {
      const payload = {
        studentId: formData.studentId || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        major: formData.major,
        department: formData.department,
        gpa: parseFloat(formData.gpa),
        creditsEarned: parseInt(formData.creditsEarned, 10),
        enrollmentYear: parseInt(formData.enrollmentYear, 10),
        status: formData.status,
        advisor: formData.advisor,
        phone: formData.phone,
      };

      if (modalMode === 'create') {
        const res = await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback({
          type: 'success',
          message: `Student ${res.data.data.studentId} created successfully.`,
        });
      } else {
        await apiRequest(`/api/students/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback({
          type: 'success',
          message: `Student ${formData.studentId} updated successfully.`,
        });
      }

      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      if (err.details && Array.isArray(err.details)) {
        setFormErrors(err.details);
      } else {
        setFeedback({
          type: 'error',
          message: err.message || 'Operation failed',
          code: err.status,
        });
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteStudent = async (stu: Student) => {
    if (!confirm(`Are you sure you want to delete student record ${stu.studentId} (${stu.firstName} ${stu.lastName})?`)) {
      return;
    }

    try {
      await apiRequest(`/api/students/${stu.id}`, {
        method: 'DELETE',
      });
      setFeedback({
        type: 'success',
        message: `Student record ${stu.studentId} deleted successfully.`,
      });
      fetchStudents();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Delete operation forbidden',
        code: err.status,
      });
    }
  };

  const handleViewDetails = async (stu: Student) => {
    setSelectedStudent(stu);
    setIsDetailOpen(true);
    setTranscriptData(null);
    setTranscriptLoading(true);

    try {
      const res = await apiRequest(`/api/courses/transcript/${stu.id}`);
      setTranscriptData(res.data.transcript);
    } catch (err: any) {
      // Might be restricted if logged in as a different student
      setTranscriptData({ error: err.message, status: err.status });
    } finally {
      setTranscriptLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & RBAC Context Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Student Records & Academic Registry
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>RBAC Policy: REST API Protected</span>
              <span aria-hidden="true">·</span>
              <span>Input Validation Schema: Active</span>
              <span aria-hidden="true">·</span>
              <span>Caller Role: <strong className="text-slate-900 font-mono">{currentUser?.role || 'ANONYMOUS'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateToTests}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Run Automated Tests
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                {feedback.code && <strong className="font-mono mr-1">[{feedback.code}]</strong>}
                {feedback.message}
              </span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, ID, email, or major..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
          />
        </div>

        {/* Status segmented tabs (Functional interactive buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'PROBATION', 'GRADUATED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Records' : st}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4">Major / Department</th>
                <th className="py-3 px-4 text-right">GPA</th>
                <th className="py-3 px-4 text-right">Credits</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium">No student records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try clearing your search query or filter.' : 'Click "Add Student" to create a new record.'}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((stu) => {
                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(stu)}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {stu.studentId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {stu.firstName} {stu.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {stu.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{stu.major}</div>
                        <div className="text-[11px] text-slate-400">{stu.department}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {stu.gpa.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {stu.creditsEarned}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs">
                          {stu.status === 'ACTIVE' && (
                            <span className="text-emerald-700 font-medium">Active</span>
                          )}
                          {stu.status === 'PROBATION' && (
                            <span className="text-amber-700 font-medium">Probation</span>
                          )}
                          {stu.status === 'GRADUATED' && (
                            <span className="text-blue-700 font-medium">Graduated</span>
                          )}
                          {stu.status === 'SUSPENDED' && (
                            <span className="text-rose-700 font-medium">Suspended</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetails(stu)}
                            title="View Transcript"
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(stu)}
                            title="Edit Student"
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(stu)}
                            title="Delete Student (Admin only)"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800 tabular-nums">{students.length}</strong> enrolled students</span>
          <span className="text-[11px]">Protected via JWT Bearer / API Key Auth</span>
        </div>
      </div>

      {/* Modal: Add or Edit Student Record */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'Register New Student Record' : `Edit Student (${formData.studentId})`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              {/* Validation errors summary */}
              {formErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Schema Validation Failed ({formErrors.length} errors)</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                    {formErrors.map((err, i) => (
                      <li key={i}>
                        <strong className="font-mono">{err.field}</strong>: {err.issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    placeholder="e.g. Maya"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    placeholder="e.g. Patel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">University Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    placeholder="m.patel@univ.edu"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Student ID {modalMode === 'create' ? '(Auto or STU-XXXXX)' : ''}
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-mono"
                    placeholder="e.g. STU-10027"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Major *</label>
                  <input
                    type="text"
                    required
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Cumulative GPA (0.00 - 4.00) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    required
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Credits Earned</label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    value={formData.creditsEarned}
                    onChange={(e) => setFormData({ ...formData, creditsEarned: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Enrollment Year</label>
                  <input
                    type="number"
                    min="2010"
                    max="2030"
                    value={formData.enrollmentYear}
                    onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Standing Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PROBATION">PROBATION</option>
                    <option value="GRADUATED">GRADUATED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Validating & Saving...' : 'Save Student Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Student Details & Official Transcript */}
      {isDetailOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-500">{selectedStudent.studentId}</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Email</span>
                    <span className="font-mono text-slate-900 font-medium">{selectedStudent.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Department</span>
                    <span className="text-slate-900 font-medium">{selectedStudent.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Cumulative GPA</span>
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {selectedStudent.gpa.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Credits Earned</span>
                    <span className="font-mono text-slate-900 font-medium tabular-nums">
                      {selectedStudent.creditsEarned} Units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Faculty Advisor</span>
                    <span className="text-slate-900 font-medium">{selectedStudent.advisor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Academic Standing</span>
                    <span className="text-slate-900 font-semibold">{selectedStudent.status}</span>
                  </div>
                </div>
              </div>

              {/* Official Transcript Section */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
                  <span>Enrolled Courses & Academic Transcript</span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">
                    GET /api/courses/transcript/{selectedStudent.studentId}
                  </span>
                </h4>

                {transcriptLoading ? (
                  <div className="py-8 text-center text-slate-400">Loading transcript...</div>
                ) : transcriptData?.error ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>Transcript Access Restricted ({transcriptData.status})</span>
                    </div>
                    <p className="mt-1 text-[11px]">{transcriptData.error}</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Course</th>
                          <th className="py-2.5 px-3">Credits</th>
                          <th className="py-2.5 px-3">Attendance</th>
                          <th className="py-2.5 px-3 text-right">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transcriptData?.courses?.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-900 mr-1.5">{c.courseCode}</span>
                              <span className="text-slate-700">{c.courseTitle}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{c.credits}</td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{c.attendanceRate}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{c.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {transcriptData?.securityVerificationHash && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Digital Verification Hash:</span>
                        <span className="font-mono text-slate-700 truncate max-w-[200px]">
                          {transcriptData.securityVerificationHash}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
