/**
 * Students REST API Controller
 * Implements CRUD operations, pagination, search, status filtering,
 * and Role-Based Access Control (RBAC) authorization enforcement.
 */

import { Router } from 'express';
import { studentsTable, enrollmentsTable, coursesTable, logSecurityEvent, type Student } from '../db.js';
import { requireAuth, requireRoles } from '../security.js';
import { validateBody, validateStudent, sanitizeString } from '../validation.js';

export const studentsRouter = Router();

// Apply auth to all student endpoints
studentsRouter.use(requireAuth);

// 1. GET /api/students - List students with search, filter, and pagination
studentsRouter.get('/', (req, res) => {
  const { search, status, department, major, page = '1', limit = '10' } = req.query;

  let results = [...studentsTable];

  // RBAC Filter: If the user is a STUDENT and has studentId, allow viewing directory or restrict
  const userRole = req.user?.role || req.apiKey?.role;

  // Search filter
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.major.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (status && typeof status === 'string') {
    results = results.filter((s) => s.status === status);
  }

  // Department filter
  if (department && typeof department === 'string') {
    results = results.filter((s) => s.department === department);
  }

  // Major filter
  if (major && typeof major === 'string') {
    results = results.filter((s) => s.major === major);
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
  const total = results.length;
  const totalPages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedStudents = results.slice(startIndex, startIndex + limitNum);

  return res.status(200).json({
    status: 200,
    data: paginatedStudents,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
    meta: {
      requesterRole: userRole,
      accessedAt: new Date().toISOString(),
    },
  });
});

// 2. GET /api/students/:id - Detailed student view with enrollments
studentsRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const student = studentsTable.find((s) => s.id === id || s.studentId === id);

  if (!student) {
    return res.status(404).json({
      status: 404,
      error: 'Not Found',
      message: `Student with identifier "${id}" does not exist.`,
    });
  }

  // Fetch enrollments
  const studentEnrollments = enrollmentsTable
    .filter((e) => e.studentId === student.id)
    .map((e) => {
      const course = coursesTable.find((c) => c.id === e.courseId);
      return {
        ...e,
        courseCode: course?.code || 'N/A',
        courseTitle: course?.title || 'Unknown Course',
        credits: course?.credits || 0,
      };
    });

  return res.status(200).json({
    status: 200,
    data: {
      ...student,
      enrollments: studentEnrollments,
    },
  });
});

// 3. POST /api/students - Create new student record (ADMIN or FACULTY only)
studentsRouter.post(
  '/',
  requireRoles('ADMIN', 'FACULTY'),
  validateBody((data) => validateStudent(data, false)),
  (req, res) => {
    const {
      firstName,
      lastName,
      email,
      major,
      department = 'School of Engineering',
      gpa = 3.5,
      creditsEarned = 0,
      enrollmentYear = new Date().getFullYear(),
      status = 'ACTIVE',
      advisor = 'Dr. Sarah Mitchell',
      phone = '+1 (555) 000-0000',
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    if (studentsTable.some((s) => s.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({
        status: 409,
        error: 'Conflict',
        message: 'A student with this email address already exists in the system.',
      });
    }

    // Auto-generate student ID: STU-100XX
    const nextNum = 10020 + studentsTable.length + 1;
    const generatedStudentId = req.body.studentId || `STU-${nextNum}`;

    const newStudent: Student = {
      id: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studentId: generatedStudentId,
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      email: normalizedEmail,
      major: sanitizeString(major),
      department: sanitizeString(department),
      gpa: Math.round(Number(gpa) * 100) / 100,
      creditsEarned: Number(creditsEarned),
      enrollmentYear: Number(enrollmentYear),
      status,
      advisor: sanitizeString(advisor),
      phone: sanitizeString(phone),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    studentsTable.unshift(newStudent);

    logSecurityEvent(
      'STUDENT_CREATED',
      req.user?.email || req.apiKey?.name || 'UNKNOWN',
      req.user?.role || req.apiKey?.role || 'UNKNOWN',
      req.ip || '127.0.0.1',
      'SUCCESS',
      `Student ${newStudent.studentId} (${newStudent.firstName} ${newStudent.lastName}) created`
    );

    return res.status(201).json({
      status: 201,
      message: 'Student record created successfully',
      data: newStudent,
    });
  }
);

// 4. PUT /api/students/:id - Update student record (ADMIN or FACULTY only)
studentsRouter.put(
  '/:id',
  requireRoles('ADMIN', 'FACULTY'),
  validateBody((data) => validateStudent(data, true)),
  (req, res) => {
    const { id } = req.params;
    const studentIndex = studentsTable.findIndex((s) => s.id === id || s.studentId === id);

    if (studentIndex === -1) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Student with identifier "${id}" does not exist.`,
      });
    }

    const current = studentsTable[studentIndex];
    const updates = req.body;

    // Check duplicate email if changed
    if (updates.email && updates.email.toLowerCase() !== current.email.toLowerCase()) {
      if (studentsTable.some((s) => s.id !== current.id && s.email.toLowerCase() === updates.email.toLowerCase())) {
        return res.status(409).json({
          status: 409,
          error: 'Conflict',
          message: 'Another student already uses this email address.',
        });
      }
    }

    const updatedStudent: Student = {
      ...current,
      firstName: updates.firstName ? sanitizeString(updates.firstName) : current.firstName,
      lastName: updates.lastName ? sanitizeString(updates.lastName) : current.lastName,
      email: updates.email ? updates.email.toLowerCase().trim() : current.email,
      major: updates.major ? sanitizeString(updates.major) : current.major,
      department: updates.department ? sanitizeString(updates.department) : current.department,
      gpa: updates.gpa !== undefined ? Math.round(Number(updates.gpa) * 100) / 100 : current.gpa,
      creditsEarned: updates.creditsEarned !== undefined ? Number(updates.creditsEarned) : current.creditsEarned,
      enrollmentYear: updates.enrollmentYear !== undefined ? Number(updates.enrollmentYear) : current.enrollmentYear,
      status: updates.status || current.status,
      advisor: updates.advisor ? sanitizeString(updates.advisor) : current.advisor,
      phone: updates.phone ? sanitizeString(updates.phone) : current.phone,
      updatedAt: new Date().toISOString(),
    };

    studentsTable[studentIndex] = updatedStudent;

    logSecurityEvent(
      'STUDENT_UPDATED',
      req.user?.email || req.apiKey?.name || 'UNKNOWN',
      req.user?.role || req.apiKey?.role || 'UNKNOWN',
      req.ip || '127.0.0.1',
      'SUCCESS',
      `Student ${updatedStudent.studentId} updated`
    );

    return res.status(200).json({
      status: 200,
      message: 'Student record updated successfully',
      data: updatedStudent,
    });
  }
);

// 5. DELETE /api/students/:id - Delete student record (ADMIN ONLY)
studentsRouter.delete('/:id', requireRoles('ADMIN'), (req, res) => {
  const { id } = req.params;
  const studentIndex = studentsTable.findIndex((s) => s.id === id || s.studentId === id);

  if (studentIndex === -1) {
    return res.status(404).json({
      status: 404,
      error: 'Not Found',
      message: `Student with identifier "${id}" does not exist.`,
    });
  }

  const removed = studentsTable.splice(studentIndex, 1)[0];

  logSecurityEvent(
    'STUDENT_DELETED',
    req.user?.email || req.apiKey?.name || 'UNKNOWN',
    req.user?.role || req.apiKey?.role || 'UNKNOWN',
    req.ip || '127.0.0.1',
    'SUCCESS',
    `Student ${removed.studentId} (${removed.firstName} ${removed.lastName}) deleted by Admin`
  );

  return res.status(200).json({
    status: 200,
    message: `Student record ${removed.studentId} deleted successfully.`,
    deletedStudent: {
      id: removed.id,
      studentId: removed.studentId,
      name: `${removed.firstName} ${removed.lastName}`,
    },
  });
});
