/**
 * Courses, Enrollments & Grades REST API Controller
 * Provides endpoints for course listings, student enrollments, grade assignments,
 * and automated transcript GPA calculation.
 */

import { Router } from 'express';
import { coursesTable, enrollmentsTable, studentsTable, logSecurityEvent, type Course, type Enrollment } from '../db.js';
import { requireAuth, requireRoles } from '../security.js';
import { validateBody, validateGrade, sanitizeString } from '../validation.js';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

// 1. GET /api/courses - List courses
coursesRouter.get('/', (req, res) => {
  return res.status(200).json({
    status: 200,
    data: coursesTable,
  });
});

// 2. POST /api/courses - Create Course (ADMIN only)
coursesRouter.post('/', requireRoles('ADMIN'), (req, res) => {
  const { code, title, credits, department, instructor, capacity, semester } = req.body;

  if (!code || !title || !credits) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Code, title, and credits are required.',
    });
  }

  const newCourse: Course = {
    id: `crs_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    code: sanitizeString(code).toUpperCase(),
    title: sanitizeString(title),
    credits: Number(credits),
    department: sanitizeString(department || 'Engineering'),
    instructor: sanitizeString(instructor || 'TBD'),
    capacity: Number(capacity || 40),
    enrolled: 0,
    semester: sanitizeString(semester || 'Fall 2026'),
  };

  coursesTable.push(newCourse);
  return res.status(201).json({ status: 201, message: 'Course created', data: newCourse });
});

// 3. GET /api/courses/enrollments - List enrollments
coursesRouter.get('/enrollments', (req, res) => {
  const { studentId, courseId } = req.query;
  let results = [...enrollmentsTable];

  if (studentId) {
    results = results.filter((e) => e.studentId === studentId);
  }
  if (courseId) {
    results = results.filter((e) => e.courseId === courseId);
  }

  const enriched = results.map((e) => {
    const student = studentsTable.find((s) => s.id === e.studentId);
    const course = coursesTable.find((c) => c.id === e.courseId);
    return {
      ...e,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      studentIdentifier: student?.studentId || 'N/A',
      courseCode: course?.code || 'N/A',
      courseTitle: course?.title || 'N/A',
      credits: course?.credits || 0,
    };
  });

  return res.status(200).json({ status: 200, data: enriched });
});

// 4. POST /api/courses/grades - Record/Update Grade (ADMIN or FACULTY only)
coursesRouter.post(
  '/grades',
  requireRoles('ADMIN', 'FACULTY'),
  validateBody(validateGrade),
  (req, res) => {
    const { studentId, courseId, grade, numericGrade, attendanceRate } = req.body;

    const student = studentsTable.find((s) => s.id === studentId || s.studentId === studentId);
    if (!student) {
      return res.status(404).json({ status: 404, error: 'Not Found', message: 'Student does not exist' });
    }

    const course = coursesTable.find((c) => c.id === courseId || c.code === courseId);
    if (!course) {
      return res.status(404).json({ status: 404, error: 'Not Found', message: 'Course does not exist' });
    }

    let enrollment = enrollmentsTable.find((e) => e.studentId === student.id && e.courseId === course.id);

    if (enrollment) {
      // Update existing
      enrollment.grade = grade || enrollment.grade;
      enrollment.numericGrade = numericGrade !== undefined ? Number(numericGrade) : enrollment.numericGrade;
      enrollment.attendanceRate = attendanceRate !== undefined ? Number(attendanceRate) : enrollment.attendanceRate;
    } else {
      // Create new enrollment with grade
      enrollment = {
        id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        studentId: student.id,
        courseId: course.id,
        semester: course.semester,
        grade,
        numericGrade: Number(numericGrade || 85),
        attendanceRate: Number(attendanceRate || 95),
        status: 'ENROLLED',
      };
      enrollmentsTable.push(enrollment);
      course.enrolled++;
    }

    // Recalculate student GPA based on letter grades
    const gradePoints: Record<string, number> = {
      A: 4.0,
      'A-': 3.7,
      'B+': 3.3,
      B: 3.0,
      'B-': 2.7,
      'C+': 2.3,
      C: 2.0,
      'C-': 1.7,
      D: 1.0,
      F: 0.0,
    };

    const studentAllEnrollments = enrollmentsTable.filter((e) => e.studentId === student.id && e.grade);
    if (studentAllEnrollments.length > 0) {
      let totalQualityPoints = 0;
      let totalCredits = 0;

      for (const enr of studentAllEnrollments) {
        const c = coursesTable.find((item) => item.id === enr.courseId);
        const creds = c?.credits || 3;
        const pts = gradePoints[enr.grade || 'B'] ?? 3.0;
        totalQualityPoints += pts * creds;
        totalCredits += creds;
      }

      if (totalCredits > 0) {
        student.gpa = Math.round((totalQualityPoints / totalCredits) * 100) / 100;
      }
    }

    logSecurityEvent(
      'GRADE_RECORDED',
      req.user?.email || req.apiKey?.name || 'FACULTY',
      req.user?.role || req.apiKey?.role || 'FACULTY',
      req.ip || '127.0.0.1',
      'SUCCESS',
      `Assigned grade ${grade} to student ${student.studentId} for ${course.code}`
    );

    return res.status(200).json({
      status: 200,
      message: 'Grade recorded and student GPA updated',
      enrollment,
      updatedStudentGpa: student.gpa,
    });
  }
);

// 5. GET /api/courses/transcript/:studentId - Full official academic transcript
coursesRouter.get('/transcript/:studentId', (req, res) => {
  const { studentId } = req.params;
  const student = studentsTable.find((s) => s.id === studentId || s.studentId === studentId);

  if (!student) {
    return res.status(404).json({ status: 404, error: 'Not Found', message: 'Student does not exist' });
  }

  // Check RBAC: Student can only view their own transcript unless Admin or Faculty
  const role = req.user?.role || req.apiKey?.role;
  if (role === 'STUDENT' && req.user?.studentId && req.user.studentId !== student.studentId) {
    return res.status(403).json({
      status: 403,
      error: 'Forbidden',
      message: 'Students are only permitted to inspect their own official transcript.',
    });
  }

  const records = enrollmentsTable
    .filter((e) => e.studentId === student.id)
    .map((e) => {
      const c = coursesTable.find((course) => course.id === e.courseId);
      return {
        courseCode: c?.code || 'N/A',
        courseTitle: c?.title || 'N/A',
        credits: c?.credits || 0,
        semester: e.semester,
        grade: e.grade || 'IN PROGRESS',
        numericGrade: e.numericGrade ?? null,
        attendanceRate: `${e.attendanceRate}%`,
        status: e.status,
      };
    });

  return res.status(200).json({
    status: 200,
    transcript: {
      institution: 'State University Academic Information System',
      student: {
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        major: student.major,
        department: student.department,
        enrollmentYear: student.enrollmentYear,
        academicStanding: student.status,
        cumulativeGpa: student.gpa,
        creditsEarned: student.creditsEarned,
      },
      courses: records,
      issuedAt: new Date().toISOString(),
      securityVerificationHash: Buffer.from(`${student.studentId}:${student.gpa}:${Date.now()}`).toString('base64'),
    },
  });
});
