/**
 * Frontend API Service Layer
 * Manages JWT tokens, API keys, HTTP request headers, and standardized error parsing.
 */

const TOKEN_KEY = 'academiasec_jwt_token';
const REFRESH_KEY = 'academiasec_refresh_token';
const USER_KEY = 'academiasec_current_user';
const API_KEY_STORAGE = 'academiasec_custom_api_key';
const AUTH_MODE_KEY = 'academiasec_auth_mode'; // 'JWT' | 'API_KEY'

export const DEFAULT_CREDENTIALS = {
  admin: { email: 'admin@univ.edu', password: 'Admin@Pass123!', role: 'ADMIN', name: 'Dr. Sarah Mitchell' },
  faculty: { email: 'faculty.chen@univ.edu', password: 'Faculty@Pass123!', role: 'FACULTY', name: 'Prof. David Chen' },
  student: { email: 'student.alex@univ.edu', password: 'Student@Pass123!', role: 'STUDENT', name: 'Alex Vance' },
  defaultApiKey: 'sms_live_sec7729fa88019bd4901c274e119b98',
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken?: string, user?: any) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE) || DEFAULT_CREDENTIALS.defaultApiKey;
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function getAuthMode(): 'JWT' | 'API_KEY' {
  return (localStorage.getItem(AUTH_MODE_KEY) as 'JWT' | 'API_KEY') || 'JWT';
}

export function setAuthMode(mode: 'JWT' | 'API_KEY') {
  localStorage.setItem(AUTH_MODE_KEY, mode);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// Universal fetch wrapper
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number; headers: Headers; rawBody?: any }> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const mode = getAuthMode();
  if (mode === 'API_KEY') {
    const apiKey = getStoredApiKey();
    if (apiKey) {
      headers.set('X-API-Key', apiKey);
    }
  } else {
    const token = getStoredToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  let rawBody: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      rawBody = await res.json();
    } catch {
      rawBody = null;
    }
  } else {
    rawBody = await res.text();
  }

  if (!res.ok) {
    const errorMessage = rawBody?.message || res.statusText || 'Request failed';
    const error: any = new Error(errorMessage);
    error.status = res.status;
    error.details = rawBody?.details;
    error.raw = rawBody;
    throw error;
  }

  return {
    data: rawBody as T,
    status: res.status,
    headers: res.headers,
    rawBody,
  };
}
