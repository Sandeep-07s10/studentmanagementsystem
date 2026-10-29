/**
 * Input Validation and Sanitization Engine for AcademiaSec
 * Enforces rigorous schema boundaries, data types, regular expressions,
 * numeric bounds, enums, and HTML/XSS sanitization.
 */

import type { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './db.js';

export interface ValidationErrorItem {
  field: string;
  issue: string;
  valueReceived?: any;
}

export type ValidatorFunction = (data: any) => ValidationErrorItem[];

// Basic XSS & HTML injection sanitizer
export function sanitizeString(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/[<>]/g, '') // Strip brackets to neutralize html/script injection
    .slice(0, 1000); // Prevent unbounded payloads
}

// Higher-order validation middleware
export function validateBody(validator: ValidatorFunction) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Request payload must be a valid JSON object',
        details: [{ field: 'root', issue: 'Missing or non-object JSON body' }],
      });
    }

    const errors = validator(req.body);

    if (errors.length > 0) {
      logSecurityEvent(
        'INPUT_VALIDATION_FAILURE',
        req.user?.email || (req.headers['x-api-key'] as string) || 'ANONYMOUS',
        req.user?.role || 'ANONYMOUS',
        req.ip || '127.0.0.1',
        'VALIDATION_FAILED',
        `Validation failed on ${req.method} ${req.path}: ${errors.map((e) => `${e.field} (${e.issue})`).join(', ')}`
      );

      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Input validation failed. Please correct the invalid fields.',
        details: errors,
      });
    }

    next();
  };
}

// 1. User Registration Validation
export function validateRegistration(data: any): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  // Name
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push({ field: 'name', issue: 'Name must be at least 2 characters long' });
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) {
    errors.push({ field: 'email', issue: 'Must provide a valid RFC-compliant email address' });
  }

  // Password Strength
  // Requires: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const password = data.password;
  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', issue: 'Password is required' });
  } else {
    if (password.length < 8) {
      errors.push({ field: 'password', issue: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      errors.push({ field: 'password', issue: 'Password must contain at least one uppercase letter (A-Z)' });
    }
    if (!/[a-z]/.test(password)) {
      errors.push({ field: 'password', issue: 'Password must contain at least one lowercase letter (a-z)' });
    }
    if (!/[0-9]/.test(password)) {
      errors.push({ field: 'password', issue: 'Password must contain at least one number (0-9)' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({ field: 'password', issue: 'Password must contain at least one special character (!@#$%...)' });
    }
  }

  // Role
  const validRoles = ['ADMIN', 'FACULTY', 'STUDENT'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push({ field: 'role', issue: `Role must be one of: ${validRoles.join(', ')}` });
  }

  return errors;
}

// 2. User Login Validation
export function validateLogin(data: any): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({ field: 'email', issue: 'Email is required' });
  }
  if (!data.password || typeof data.password !== 'string' || data.password.trim() === '') {
    errors.push({ field: 'password', issue: 'Password is required' });
  }

  return errors;
}

// 3. Student Creation / Update Validation
export function validateStudent(data: any, isUpdate = false): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  // First & Last Name
  if (!isUpdate || data.firstName !== undefined) {
    if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', issue: 'First name is required and must be at least 2 characters' });
    }
  }

  if (!isUpdate || data.lastName !== undefined) {
    if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', issue: 'Last name is required and must be at least 2 characters' });
    }
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!isUpdate || data.email !== undefined) {
    if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) {
      errors.push({ field: 'email', issue: 'Valid university email is required' });
    }
  }

  // Student ID pattern if provided: STU-XXXXX
  if (data.studentId !== undefined) {
    if (!/^STU-\d{5}$/.test(data.studentId)) {
      errors.push({ field: 'studentId', issue: 'Student ID must follow format STU-XXXXX (e.g. STU-10021)' });
    }
  }

  // Major
  if (!isUpdate || data.major !== undefined) {
    if (!data.major || typeof data.major !== 'string' || data.major.trim().length < 2) {
      errors.push({ field: 'major', issue: 'Major is required (min 2 characters)' });
    }
  }

  // GPA (0.00 to 4.00)
  if (!isUpdate || data.gpa !== undefined) {
    const gpaNum = Number(data.gpa);
    if (isNaN(gpaNum) || gpaNum < 0.0 || gpaNum > 4.0) {
      errors.push({ field: 'gpa', issue: 'GPA must be a floating point number between 0.00 and 4.00' });
    }
  }

  // Credits Earned
  if (!isUpdate || data.creditsEarned !== undefined) {
    const creditsNum = Number(data.creditsEarned);
    if (isNaN(creditsNum) || !Number.isInteger(creditsNum) || creditsNum < 0 || creditsNum > 240) {
      errors.push({ field: 'creditsEarned', issue: 'Credits earned must be an integer between 0 and 240' });
    }
  }

  // Enrollment Year
  if (!isUpdate || data.enrollmentYear !== undefined) {
    const yearNum = Number(data.enrollmentYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 2010 || yearNum > currentYear + 1) {
      errors.push({ field: 'enrollmentYear', issue: `Enrollment year must be between 2010 and ${currentYear + 1}` });
    }
  }

  // Status Enum
  const validStatuses = ['ACTIVE', 'PROBATION', 'GRADUATED', 'SUSPENDED'];
  if (!isUpdate || data.status !== undefined) {
    if (!data.status || !validStatuses.includes(data.status)) {
      errors.push({ field: 'status', issue: `Status must be one of: ${validStatuses.join(', ')}` });
    }
  }

  return errors;
}

// 4. Grade Entry Validation
export function validateGrade(data: any): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  if (!data.studentId || typeof data.studentId !== 'string') {
    errors.push({ field: 'studentId', issue: 'Target student ID is required' });
  }

  if (!data.courseId || typeof data.courseId !== 'string') {
    errors.push({ field: 'courseId', issue: 'Course ID is required' });
  }

  const validGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'I', 'W'];
  if (data.grade !== undefined && !validGrades.includes(data.grade)) {
    errors.push({ field: 'grade', issue: `Letter grade must be one of: ${validGrades.join(', ')}` });
  }

  if (data.numericGrade !== undefined) {
    const num = Number(data.numericGrade);
    if (isNaN(num) || num < 0 || num > 100) {
      errors.push({ field: 'numericGrade', issue: 'Numeric score must be between 0 and 100' });
    }
  }

  if (data.attendanceRate !== undefined) {
    const att = Number(data.attendanceRate);
    if (isNaN(att) || att < 0 || att > 100) {
      errors.push({ field: 'attendanceRate', issue: 'Attendance rate percentage must be between 0 and 100' });
    }
  }

  return errors;
}

// 5. API Key Creation Validation
export function validateApiKey(data: any): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
    errors.push({ field: 'name', issue: 'API Key application name must be at least 3 characters' });
  }

  const validRoles = ['ADMIN', 'FACULTY', 'STUDENT'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push({ field: 'role', issue: `Role must be one of: ${validRoles.join(', ')}` });
  }

  if (data.rateLimitPerMin !== undefined) {
    const rate = Number(data.rateLimitPerMin);
    if (isNaN(rate) || rate < 10 || rate > 1000) {
      errors.push({ field: 'rateLimitPerMin', issue: 'Rate limit must be between 10 and 1000 requests/minute' });
    }
  }

  return errors;
}
