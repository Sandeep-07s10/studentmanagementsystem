/**
 * In-Memory & Initialized Database Store for AcademiaSec
 * Provides realistic pre-seeded data for Students, Courses, Grades, Users, and API Keys.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  department?: string;
  studentId?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentId: string; // STU-10021
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  department: string;
  gpa: number;
  creditsEarned: number;
  enrollmentYear: number;
  status: 'ACTIVE' | 'PROBATION' | 'GRADUATED' | 'SUSPENDED';
  advisor: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string; // CS-301
  title: string;
  credits: number;
  department: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  semester: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semester: string;
  grade?: string; // A, B+, etc.
  numericGrade?: number;
  attendanceRate: number; // e.g. 96.5%
  status: 'ENROLLED' | 'COMPLETED' | 'DROPPED';
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string; // e.g. sms_live_a1b2...
  keyHash: string; // SHA-256 hash of the full secret key
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  scopes: string[];
  rateLimitPerMin: number;
  requestCount: number;
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role: string;
  ip: string;
  status: 'SUCCESS' | 'DENIED' | 'VALIDATION_FAILED';
  details: string;
}

// In-memory data tables
export const usersTable: User[] = [];
export const studentsTable: Student[] = [];
export const coursesTable: Course[] = [];
export const enrollmentsTable: Enrollment[] = [];
export const apiKeysTable: ApiKeyRecord[] = [];
export const auditLogsTable: SecurityAuditLog[] = [];

// Seed database with pre-hashed passwords
export function initDatabase() {
  if (usersTable.length > 0) return; // Already initialized

  // Salt and hash passwords using bcrypt
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@Pass123!', salt);
  const facultyHash = bcrypt.hashSync('Faculty@Pass123!', salt);
  const studentHash = bcrypt.hashSync('Student@Pass123!', salt);

  usersTable.push(
    {
      id: 'usr_admin_01',
      name: 'Dr. Sarah Mitchell',
      email: 'admin@univ.edu',
      passwordHash: adminHash,
      role: 'ADMIN',
      department: 'Academic Registry & InfoSec',
      createdAt: new Date('2025-01-10').toISOString(),
    },
    {
      id: 'usr_fac_01',
      name: 'Prof. David Chen',
      email: 'faculty.chen@univ.edu',
      passwordHash: facultyHash,
      role: 'FACULTY',
      department: 'Computer Science',
      createdAt: new Date('2025-01-15').toISOString(),
    },
    {
      id: 'usr_stu_01',
      name: 'Alex Vance',
      email: 'student.alex@univ.edu',
      passwordHash: studentHash,
      role: 'STUDENT',
      studentId: 'STU-10021',
      department: 'Computer Science',
      createdAt: new Date('2025-02-01').toISOString(),
    }
  );

  // Seed Students
  studentsTable.push(
    {
      id: 'stu_01',
      studentId: 'STU-10021',
      firstName: 'Alex',
      lastName: 'Vance',
      email: 'student.alex@univ.edu',
      major: 'Computer Science',
      department: 'School of Engineering',
      gpa: 3.88,
      creditsEarned: 88,
      enrollmentYear: 2023,
      status: 'ACTIVE',
      advisor: 'Prof. David Chen',
      phone: '+1 (555) 234-5678',
      createdAt: '2023-08-20T10:00:00Z',
      updatedAt: '2026-02-14T12:00:00Z',
    },
    {
      id: 'stu_02',
      studentId: 'STU-10022',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'e.rostova@univ.edu',
      major: 'Cybersecurity & Networks',
      department: 'School of Engineering',
      gpa: 3.95,
      creditsEarned: 96,
      enrollmentYear: 2023,
      status: 'ACTIVE',
      advisor: 'Prof. David Chen',
      phone: '+1 (555) 345-6789',
      createdAt: '2023-08-20T10:15:00Z',
      updatedAt: '2026-03-01T15:20:00Z',
    },
    {
      id: 'stu_03',
      studentId: 'STU-10023',
      firstName: 'Marcus',
      lastName: 'Holloway',
      email: 'm.holloway@univ.edu',
      major: 'Software Engineering',
      department: 'School of Engineering',
      gpa: 3.65,
      creditsEarned: 74,
      enrollmentYear: 2024,
      status: 'ACTIVE',
      advisor: 'Prof. Amanda Blake',
      phone: '+1 (555) 456-7890',
      createdAt: '2024-08-18T09:30:00Z',
      updatedAt: '2026-01-20T11:45:00Z',
    },
    {
      id: 'stu_04',
      studentId: 'STU-10024',
      firstName: 'Sophia',
      lastName: 'Lin',
      email: 'sophia.lin@univ.edu',
      major: 'Data Science & AI',
      department: 'School of Computing',
      gpa: 3.92,
      creditsEarned: 112,
      enrollmentYear: 2022,
      status: 'ACTIVE',
      advisor: 'Dr. Kevin Zhao',
      phone: '+1 (555) 567-8901',
      createdAt: '2022-08-22T14:00:00Z',
      updatedAt: '2026-02-28T16:10:00Z',
    },
    {
      id: 'stu_05',
      studentId: 'STU-10025',
      firstName: 'Tariq',
      lastName: 'Mansoor',
      email: 't.mansoor@univ.edu',
      major: 'Electrical Engineering',
      department: 'School of Engineering',
      gpa: 2.74,
      creditsEarned: 52,
      enrollmentYear: 2024,
      status: 'PROBATION',
      advisor: 'Prof. Amanda Blake',
      phone: '+1 (555) 678-9012',
      createdAt: '2024-08-25T11:10:00Z',
      updatedAt: '2026-02-10T14:30:00Z',
    },
    {
      id: 'stu_06',
      studentId: 'STU-10026',
      firstName: 'Amara',
      lastName: 'Okonkwo',
      email: 'a.okonkwo@univ.edu',
      major: 'Computer Science',
      department: 'School of Engineering',
      gpa: 3.81,
      creditsEarned: 124,
      enrollmentYear: 2022,
      status: 'GRADUATED',
      advisor: 'Prof. David Chen',
      phone: '+1 (555) 789-0123',
      createdAt: '2022-08-19T08:45:00Z',
      updatedAt: '2026-06-15T18:00:00Z',
    }
  );

  // Seed Courses
  coursesTable.push(
    {
      id: 'crs_01',
      code: 'CS-401',
      title: 'Advanced Web Security & Cryptography',
      credits: 4,
      department: 'Computer Science',
      instructor: 'Prof. David Chen',
      capacity: 35,
      enrolled: 28,
      semester: 'Fall 2026',
    },
    {
      id: 'crs_02',
      code: 'CS-330',
      title: 'Distributed Systems & Microservices',
      credits: 3,
      department: 'Computer Science',
      instructor: 'Dr. Kevin Zhao',
      capacity: 40,
      enrolled: 38,
      semester: 'Fall 2026',
    },
    {
      id: 'crs_03',
      code: 'SEC-310',
      title: 'Network Defense & Penetration Testing',
      credits: 4,
      department: 'Cybersecurity',
      instructor: 'Prof. David Chen',
      capacity: 30,
      enrolled: 29,
      semester: 'Fall 2026',
    },
    {
      id: 'crs_04',
      code: 'MATH-240',
      title: 'Discrete Mathematics & Cryptographic Logic',
      credits: 3,
      department: 'Mathematics',
      instructor: 'Dr. Kevin Zhao',
      capacity: 50,
      enrolled: 44,
      semester: 'Fall 2026',
    }
  );

  // Seed Enrollments & Grades
  enrollmentsTable.push(
    {
      id: 'enr_01',
      studentId: 'stu_01',
      courseId: 'crs_01',
      semester: 'Fall 2026',
      grade: 'A',
      numericGrade: 94,
      attendanceRate: 98.2,
      status: 'ENROLLED',
    },
    {
      id: 'enr_02',
      studentId: 'stu_01',
      courseId: 'crs_02',
      semester: 'Fall 2026',
      grade: 'A-',
      numericGrade: 91,
      attendanceRate: 95.0,
      status: 'ENROLLED',
    },
    {
      id: 'enr_03',
      studentId: 'stu_01',
      courseId: 'crs_03',
      semester: 'Fall 2026',
      grade: 'A',
      numericGrade: 96,
      attendanceRate: 100.0,
      status: 'ENROLLED',
    },
    {
      id: 'enr_04',
      studentId: 'stu_02',
      courseId: 'crs_01',
      semester: 'Fall 2026',
      grade: 'A',
      numericGrade: 97,
      attendanceRate: 99.1,
      status: 'ENROLLED',
    },
    {
      id: 'enr_05',
      studentId: 'stu_02',
      courseId: 'crs_03',
      semester: 'Fall 2026',
      grade: 'A',
      numericGrade: 98,
      attendanceRate: 97.5,
      status: 'ENROLLED',
    },
    {
      id: 'enr_06',
      studentId: 'stu_05',
      courseId: 'crs_04',
      semester: 'Fall 2026',
      grade: 'C',
      numericGrade: 73,
      attendanceRate: 78.4,
      status: 'ENROLLED',
    }
  );

  // Seed default developer API key
  const defaultRawKey = 'sms_live_sec7729fa88019bd4901c274e119b98';
  const hashedDefaultKey = crypto.createHash('sha256').update(defaultRawKey).digest('hex');

  apiKeysTable.push({
    id: 'key_default_01',
    name: 'University Portal Integration Key',
    keyPrefix: 'sms_live_sec7729...',
    keyHash: hashedDefaultKey,
    role: 'ADMIN',
    scopes: ['read:students', 'write:students', 'read:grades', 'write:grades', 'admin:all'],
    rateLimitPerMin: 120,
    requestCount: 384,
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: new Date('2025-01-01').toISOString(),
    createdBy: 'admin@univ.edu',
    isActive: true,
  });

  // Initial audit log
  auditLogsTable.push({
    id: 'log_01',
    timestamp: new Date().toISOString(),
    action: 'SYSTEM_BOOTSTRAP',
    actor: 'system',
    role: 'SYSTEM',
    ip: '127.0.0.1',
    status: 'SUCCESS',
    details: 'Database initialized with encrypted credentials, student records, and TLS posture policies',
  });
}

// Helper to log security actions
export function logSecurityEvent(
  action: string,
  actor: string,
  role: string,
  ip: string,
  status: 'SUCCESS' | 'DENIED' | 'VALIDATION_FAILED',
  details: string
) {
  auditLogsTable.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    actor,
    role,
    ip,
    status,
    details,
  });
  if (auditLogsTable.length > 200) {
    auditLogsTable.pop();
  }
}
