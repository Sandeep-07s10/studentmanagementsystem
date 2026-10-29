export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  department?: string;
  studentId?: string;
  createdAt?: string;
}

export interface Student {
  id: string;
  studentId: string;
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
  enrollments?: StudentEnrollment[];
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  semester: string;
  grade?: string;
  numericGrade?: number;
  attendanceRate: number;
  status: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  department: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  semester: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
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

export interface SecurityAuditItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role: string;
  ip: string;
  status: 'SUCCESS' | 'DENIED' | 'VALIDATION_FAILED';
  details: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'JWT' | 'API_KEYS' | 'PASSWORD_HASHING' | 'INPUT_VALIDATION' | 'HTTPS_SECURITY' | 'REST_API';
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  assertion: string;
  expected: any;
  actual: any;
  requestPayload?: any;
  responsePayload?: any;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: string;
  totalDurationMs: number;
  executedAt: string;
}
