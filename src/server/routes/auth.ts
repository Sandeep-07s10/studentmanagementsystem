/**
 * Authentication REST API Routes
 * Implements user registration, login, token refresh, current profile, and bcrypt demonstration.
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersTable, logSecurityEvent, type User } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  authenticateJwt,
  createRateLimiter,
  REFRESH_SECRET,
} from '../security.js';
import { validateBody, validateRegistration, validateLogin, sanitizeString } from '../validation.js';

export const authRouter = Router();

// Rate limit login attempts: max 15 requests per minute per IP
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please try again after 60 seconds.',
});

// 1. User Registration
authRouter.post(
  '/register',
  authLimiter,
  validateBody(validateRegistration),
  async (req, res) => {
    try {
      const { name, email, password, role = 'STUDENT', department, studentId } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = usersTable.find((u) => u.email === normalizedEmail);
      if (existing) {
        logSecurityEvent(
          'USER_REGISTRATION_FAILED',
          normalizedEmail,
          role,
          req.ip || '127.0.0.1',
          'DENIED',
          'Account with this email already exists'
        );
        return res.status(409).json({
          status: 409,
          error: 'Conflict',
          message: 'An account with this email address already exists.',
        });
      }

      // Hash password using bcrypt
      const passwordHash = await hashPassword(password);

      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: sanitizeString(name),
        email: normalizedEmail,
        passwordHash,
        role: role as 'ADMIN' | 'FACULTY' | 'STUDENT',
        department: department ? sanitizeString(department) : undefined,
        studentId: studentId ? sanitizeString(studentId) : undefined,
        createdAt: new Date().toISOString(),
      };

      usersTable.push(newUser);

      // Generate JWT tokens
      const accessToken = generateAccessToken(newUser);
      const refreshToken = generateRefreshToken(newUser);

      logSecurityEvent(
        'USER_REGISTERED',
        newUser.email,
        newUser.role,
        req.ip || '127.0.0.1',
        'SUCCESS',
        `User registered with role ${newUser.role} and bcrypt hashed credentials`
      );

      return res.status(201).json({
        status: 201,
        message: 'User registered successfully with encrypted credentials',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          studentId: newUser.studentId,
          createdAt: newUser.createdAt,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '2 hours',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ status: 500, error: 'Internal Server Error', message: err.message });
    }
  }
);

// 2. User Login
authRouter.post(
  '/login',
  authLimiter,
  validateBody(validateLogin),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const user = usersTable.find((u) => u.email === normalizedEmail);

      // Timing attack mitigation: always run bcrypt compare even if user not found
      const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      const hashToVerify = user ? user.passwordHash : dummyHash;
      const isMatch = await verifyPassword(password, hashToVerify);

      if (!user || !isMatch) {
        logSecurityEvent(
          'LOGIN_FAILED',
          normalizedEmail,
          'UNKNOWN',
          req.ip || '127.0.0.1',
          'DENIED',
          'Invalid username or password credentials'
        );
        return res.status(401).json({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password credentials.',
        });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logSecurityEvent(
        'LOGIN_SUCCESS',
        user.email,
        user.role,
        req.ip || '127.0.0.1',
        'SUCCESS',
        `Authenticated successfully via bcrypt hash comparison`
      );

      return res.status(200).json({
        status: 200,
        message: 'Authentication successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          studentId: user.studentId,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '2 hours',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ status: 500, error: 'Internal Server Error', message: err.message });
    }
  }
);

// 3. Get Current Profile & Permissions (Requires JWT)
authRouter.get('/me', authenticateJwt, (req, res) => {
  const user = usersTable.find((u) => u.id === req.user?.sub);
  if (!user) {
    return res.status(404).json({ status: 404, error: 'User Not Found' });
  }

  return res.status(200).json({
    status: 200,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      createdAt: user.createdAt,
    },
    jwt: {
      subject: req.user?.sub,
      role: req.user?.role,
      permissions: req.user?.permissions,
      issuedAt: req.user?.iat ? new Date(req.user.iat * 1000).toISOString() : null,
      expiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null,
    },
  });
});

// 4. Token Refresh
authRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'refreshToken is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    const user = usersTable.find((u) => u.id === decoded.sub);
    if (!user) {
      return res.status(404).json({ status: 404, error: 'User Not Found' });
    }

    const newAccessToken = generateAccessToken(user);
    return res.status(200).json({
      status: 200,
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: '2 hours',
    });
  } catch (err) {
    return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token' });
  }
});

// 5. Educational / Live Cryptography Demo endpoint for Bcrypt & JWT analysis
authRouter.post('/crypto-demo', async (req, res) => {
  const { samplePassword = 'StudentSecure@2026!' } = req.body;
  const start = performance.now();
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(samplePassword, salt);
  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  // Verify
  const isMatch = await bcrypt.compare(samplePassword, hash);
  const isMismatch = await bcrypt.compare('WrongPassword123!', hash);

  return res.status(200).json({
    algorithm: 'bcrypt (Blowfish cipher based adaptive hashing)',
    costFactor: saltRounds,
    durationMs,
    salt,
    resultingHash: hash,
    verificationTest: {
      withCorrectPassword: isMatch,
      withWrongPassword: isMismatch,
    },
    securityAnalysis: {
      timingResistant: true,
      rainbowTableImmune: true,
      saltEmbeddedInOutput: true,
    },
  });
});
