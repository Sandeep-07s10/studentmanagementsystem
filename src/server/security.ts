/**
 * Core Security, Cryptography & Auth Middleware for AcademiaSec
 * Implements:
 *  - Password Hashing (bcrypt, 10 rounds)
 *  - JWT generation and verification (HS256)
 *  - API Key creation, SHA-256 storage hashing, and validation
 *  - Role-Based Access Control (RBAC) & Scope verification
 *  - Rate Limiting (in-memory sliding window)
 *  - HTTP/TLS Security Headers (HSTS, CSP, X-Frame-Options, etc.)
 */

import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { apiKeysTable, logSecurityEvent, type User } from './db.js';

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'academiasec-jwt-super-secret-key-32chars-min!';
export const JWT_EXPIRES_IN = '2h';
export const REFRESH_SECRET = process.env.REFRESH_SECRET || 'academiasec-refresh-secret-key-prod-99!';
export const REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  department?: string;
  studentId?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      apiKey?: {
        id: string;
        name: string;
        role: 'ADMIN' | 'FACULTY' | 'STUDENT';
        scopes: string[];
      };
      authType?: 'JWT' | 'API_KEY';
    }
  }
}

// 1. Password Hashing (bcrypt)
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// Determine default permissions by role
export function getRolePermissions(role: 'ADMIN' | 'FACULTY' | 'STUDENT'): string[] {
  switch (role) {
    case 'ADMIN':
      return [
        'students:read',
        'students:create',
        'students:update',
        'students:delete',
        'courses:manage',
        'grades:manage',
        'apikeys:manage',
        'security:audit',
        'system:admin',
      ];
    case 'FACULTY':
      return [
        'students:read',
        'students:create',
        'students:update',
        'courses:read',
        'grades:manage',
      ];
    case 'STUDENT':
      return [
        'students:read:own',
        'grades:read:own',
        'courses:read',
      ];
  }
}

// 2. JWT Generation & Verification
export function generateAccessToken(user: User): string {
  const permissions = getRolePermissions(user.role);
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
    permissions,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });
}

export function generateRefreshToken(user: User): string {
  return jwt.sign({ sub: user.id, email: user.email }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// 3. API Key Management & Hashing
export function generateRawApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const rawKey = `sms_live_${randomHex}`;
  const keyPrefix = `${rawKey.substring(0, 16)}...`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

// 4. Rate Limiter (Sliding Window per IP/Key)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key']
      ? `key:${req.headers['x-api-key']}`
      : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;

    const now = Date.now();
    let bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      rateLimitStore.set(key, bucket);
    } else {
      bucket.count++;
    }

    const remaining = Math.max(0, options.maxRequests - bucket.count);
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());

    if (bucket.count > options.maxRequests) {
      res.setHeader('Retry-After', retryAfterSec.toString());
      logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        key,
        'ANONYMOUS',
        req.ip || '127.0.0.1',
        'DENIED',
        `Exceeded limit of ${options.maxRequests} req per ${options.windowMs / 1000}s`
      );
      return res.status(429).json({
        status: 429,
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please wait before retrying.',
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// 5. Middleware: HTTPS & Security Headers
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // HTTP Strict Transport Security (HSTS) - enforce TLS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Cross-site scripting filter
  res.setHeader('X-XSS-Protection', '0');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ws: wss:;"
  );
  // Hide server identification
  res.removeHeader('X-Powered-By');
  next();
}

// 6. Middleware: Authenticate JWT Token
export function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Authentication required. Missing Authorization header.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected "Bearer <token>".',
    });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    req.authType = 'JWT';
    next();
  } catch (err: any) {
    logSecurityEvent(
      'JWT_AUTH_FAILED',
      'unknown',
      'ANONYMOUS',
      req.ip || '127.0.0.1',
      'DENIED',
      err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid signature or malformed token'
    );

    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'JWT token has expired' : 'Invalid or malformed JWT token',
      reason: err.name,
    });
  }
}

// 7. Middleware: API Key Authentication
export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;

  let candidateKey = apiKeyHeader;
  if (!candidateKey && authHeader?.startsWith('Bearer sms_live_')) {
    candidateKey = authHeader.substring(7);
  }

  if (!candidateKey) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Missing API key. Provide via "X-API-Key" header or "Bearer sms_live_..."',
    });
  }

  const hashed = crypto.createHash('sha256').update(candidateKey).digest('hex');
  const record = apiKeysTable.find((k) => k.keyHash === hashed && k.isActive);

  if (!record) {
    logSecurityEvent(
      'API_KEY_AUTH_FAILED',
      candidateKey.substring(0, 14) + '...',
      'ANONYMOUS',
      req.ip || '127.0.0.1',
      'DENIED',
      'API key not found, inactive, or invalid'
    );
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Invalid or revoked API key.',
    });
  }

  // Check expiration
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'API key has expired.',
    });
  }

  // Update record usage
  record.requestCount++;
  record.lastUsedAt = new Date().toISOString();

  req.apiKey = {
    id: record.id,
    name: record.name,
    role: record.role,
    scopes: record.scopes,
  };
  req.authType = 'API_KEY';
  next();
}

// 8. Unified Authenticator (Supports EITHER JWT or API Key)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;

  if (apiKeyHeader || (authHeader && authHeader.startsWith('Bearer sms_live_'))) {
    return authenticateApiKey(req, res, next);
  }
  return authenticateJwt(req, res, next);
}

// 9. Middleware: Role-Based Access Control (RBAC)
export function requireRoles(...allowedRoles: Array<'ADMIN' | 'FACULTY' | 'STUDENT'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || req.apiKey?.role;
    const actor = req.user?.email || req.apiKey?.name || 'unknown';

    if (!userRole) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'No authenticated identity found.',
      });
    }

    if (!allowedRoles.includes(userRole)) {
      logSecurityEvent(
        'RBAC_ACCESS_DENIED',
        actor,
        userRole,
        req.ip || '127.0.0.1',
        'DENIED',
        `Forbidden role [${userRole}]. Required one of: [${allowedRoles.join(', ')}] on ${req.method} ${req.path}`
      );

      return res.status(403).json({
        status: 403,
        error: 'Forbidden',
        message: `Access denied. Role "${userRole}" lacks sufficient permissions. Required roles: [${allowedRoles.join(', ')}]`,
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
}

// 10. Middleware: Scopes / Granular Permission Check
export function requirePermissions(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    let permissions: string[] = [];
    if (req.user) {
      permissions = req.user.permissions || [];
    } else if (req.apiKey) {
      permissions = req.apiKey.scopes || [];
    }

    const hasAll = requiredPermissions.every((perm) =>
      permissions.includes(perm) || permissions.includes('admin:all') || permissions.includes('system:admin')
    );

    if (!hasAll) {
      const actor = req.user?.email || req.apiKey?.name || 'unknown';
      const role = req.user?.role || req.apiKey?.role || 'UNKNOWN';

      logSecurityEvent(
        'PERMISSION_DENIED',
        actor,
        role,
        req.ip || '127.0.0.1',
        'DENIED',
        `Missing required permissions [${requiredPermissions.join(', ')}] on ${req.method} ${req.path}`
      );

      return res.status(403).json({
        status: 403,
        error: 'Forbidden',
        message: 'Access denied. Missing required permission scope.',
        requiredPermissions,
        grantedPermissions: permissions,
      });
    }

    next();
  };
}
