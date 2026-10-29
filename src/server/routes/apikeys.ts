/**
 * API Key Management REST Controller
 * Provides secure generation, SHA-256 storage hashing, revocation,
 * and scope management for programmatic REST API access.
 */

import { Router } from 'express';
import { apiKeysTable, logSecurityEvent, type ApiKeyRecord } from '../db.js';
import { requireAuth, requireRoles, generateRawApiKey, hashApiKey } from '../security.js';
import { validateBody, validateApiKey, sanitizeString } from '../validation.js';

export const apiKeysRouter = Router();

// Apply auth to all API key management
apiKeysRouter.use(requireAuth);

// 1. GET /api/api-keys - List all configured API keys (ADMIN only)
apiKeysRouter.get('/', requireRoles('ADMIN'), (req, res) => {
  const safeKeys = apiKeysTable.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    role: k.role,
    scopes: k.scopes,
    rateLimitPerMin: k.rateLimitPerMin,
    requestCount: k.requestCount,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
    createdBy: k.createdBy,
    isActive: k.isActive,
  }));

  return res.status(200).json({
    status: 200,
    data: safeKeys,
  });
});

// 2. POST /api/api-keys - Generate a new API Key (ADMIN only)
apiKeysRouter.post(
  '/',
  requireRoles('ADMIN'),
  validateBody(validateApiKey),
  (req, res) => {
    const {
      name,
      role = 'FACULTY',
      scopes = ['read:students', 'read:grades'],
      rateLimitPerMin = 100,
      expiryDays = 90,
    } = req.body;

    const { rawKey, keyPrefix, keyHash } = generateRawApiKey();
    const expiresAt = new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();

    const newKeyRecord: ApiKeyRecord = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: sanitizeString(name),
      keyPrefix,
      keyHash,
      role: role as 'ADMIN' | 'FACULTY' | 'STUDENT',
      scopes: Array.isArray(scopes) ? scopes : ['read:students'],
      rateLimitPerMin: Number(rateLimitPerMin),
      requestCount: 0,
      lastUsedAt: null,
      expiresAt,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || 'admin@univ.edu',
      isActive: true,
    };

    apiKeysTable.push(newKeyRecord);

    logSecurityEvent(
      'API_KEY_CREATED',
      req.user?.email || 'admin@univ.edu',
      req.user?.role || 'ADMIN',
      req.ip || '127.0.0.1',
      'SUCCESS',
      `Issued API key "${newKeyRecord.name}" with prefix ${keyPrefix} and role ${newKeyRecord.role}`
    );

    return res.status(201).json({
      status: 201,
      message: 'API Key generated successfully. Save this raw secret now, it will NOT be shown again.',
      apiKey: {
        id: newKeyRecord.id,
        name: newKeyRecord.name,
        rawKey, // Returned ONLY once upon creation!
        keyPrefix: newKeyRecord.keyPrefix,
        role: newKeyRecord.role,
        scopes: newKeyRecord.scopes,
        rateLimitPerMin: newKeyRecord.rateLimitPerMin,
        expiresAt: newKeyRecord.expiresAt,
        createdAt: newKeyRecord.createdAt,
      },
    });
  }
);

// 3. DELETE /api/api-keys/:id - Revoke API Key (ADMIN only)
apiKeysRouter.delete('/:id', requireRoles('ADMIN'), (req, res) => {
  const { id } = req.params;
  const index = apiKeysTable.findIndex((k) => k.id === id);

  if (index === -1) {
    return res.status(404).json({
      status: 404,
      error: 'Not Found',
      message: 'API Key not found.',
    });
  }

  const removed = apiKeysTable.splice(index, 1)[0];

  logSecurityEvent(
    'API_KEY_REVOKED',
    req.user?.email || 'admin@univ.edu',
    'ADMIN',
    req.ip || '127.0.0.1',
    'SUCCESS',
    `Permanently revoked API key "${removed.name}" (${removed.keyPrefix})`
  );

  return res.status(200).json({
    status: 200,
    message: `API Key "${removed.name}" successfully revoked.`,
  });
});

// 4. POST /api/api-keys/test-validate - Validate an arbitrary API Key (for testing)
apiKeysRouter.post('/test-validate', (req, res) => {
  const { candidateKey } = req.body;
  if (!candidateKey || typeof candidateKey !== 'string') {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'candidateKey string is required.',
    });
  }

  const hash = hashApiKey(candidateKey.trim());
  const found = apiKeysTable.find((k) => k.keyHash === hash);

  if (!found) {
    return res.status(401).json({
      status: 401,
      valid: false,
      message: 'Key signature did not match any active hash records.',
    });
  }

  if (!found.isActive) {
    return res.status(403).json({
      status: 403,
      valid: false,
      message: 'API Key exists but is currently deactivated.',
    });
  }

  const isExpired = new Date(found.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return res.status(403).json({
      status: 403,
      valid: false,
      message: 'API Key has expired.',
    });
  }

  return res.status(200).json({
    status: 200,
    valid: true,
    keyDetails: {
      id: found.id,
      name: found.name,
      prefix: found.keyPrefix,
      role: found.role,
      scopes: found.scopes,
      rateLimitPerMin: found.rateLimitPerMin,
      totalRequestsServed: found.requestCount,
      expiresAt: found.expiresAt,
    },
  });
});
