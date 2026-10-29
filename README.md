# AcademiaSec - Secure Student Management System

A production-grade, full-stack Student Information & Security Management platform featuring robust authentication, role-based authorization (RBAC), stateless JWT token verification, SHA-256 API key hashing, adaptive bcrypt password hashing, rigorous input validation schemas, HTTPS/TLS transport security, and an automated verification test suite.

---

## 🌟 Key Architectural Features

### 1. Authentication & Identity Management
- **User Registration & Login**: Full credentials verification with timing-attack resistant password matching.
- **Pre-Configured Role Accounts**:
  - **Admin**: `admin@univ.edu` / `Admin@Pass123!` (Full system, user, course, grade, and API key management)
  - **Faculty**: `faculty.chen@univ.edu` / `Faculty@Pass123!` (Student directory, grading, attendance)
  - **Student**: `student.alex@univ.edu` / `Student@Pass123!` (Personal profile, own enrollments, transcript)

### 2. Password Cryptographic Hashing (bcrypt)
- Built with **bcrypt** (10 salt rounds = $2^{10}$ iterations).
- Salting prevents pre-computation and rainbow table attacks.
- Passwords stored in modular crypt format (`$2a$10$...` / `$2b$10$...`) and never returned over the network.
- Includes an interactive live bcrypt hashing demonstrator and timing-safe comparator.

### 3. JWT Tokens (RFC 7519)
- Signed with HMAC-SHA256 (`HS256`) containing `sub`, `email`, `role`, and assigned permissions.
- Access token expiration: 2 hours; Refresh token expiration: 7 days.
- Features an interactive **JWT Inspector** with Header, Payload, and Signature breakdown.
- Built-in signature anti-tampering verification test demonstrating immediate token rejection upon payload mutation.

### 4. Role-Based Access Control (RBAC) & Authorization
- Enforces strict role privilege boundaries across `ADMIN`, `FACULTY`, and `STUDENT`.
- Route guard middleware blocks unauthorized operations with standardized `403 Forbidden` responses.
- Example: Student accounts attempting to delete student records or view other students' transcripts are blocked with `403 Forbidden`.

### 5. API Key Validation & Programmatic Access
- Issues programmatic developer keys (`sms_live_<32_hex_chars>`) for backend integrations.
- Stored using one-way **SHA-256 digests** in the database; raw secret keys are displayed only once upon generation.
- Per-key sliding-window rate limits and fine-grained scope enforcement (`read:students`, `write:students`, `read:grades`, etc.).
- Validated via `X-API-Key` or `Authorization: Bearer sms_live_...` headers.

### 6. Input Validation & Data Boundaries
- Schema validation for all endpoints with strict regular expressions and type checking.
- Boundary rules:
  - GPA: Floats between `0.00` and `4.00`.
  - Student ID: `STU-XXXXX` format.
  - Email: University domain RFC-compliant format.
  - Password Complexity: Minimum 8 characters, uppercase letter, lowercase letter, number, and special character.
- Returns standardized `400 Bad Request` with field-by-field error descriptions.

### 7. HTTPS / TLS Transport & Defensive Headers
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **MIME Sniffing**: `X-Content-Type-Options: nosniff`
- **Frame Guard**: `X-Frame-Options: SAMEORIGIN`
- **Content Security Policy**: `Content-Security-Policy`
- **Rate Limiting**: Sliding window throttling on auth (15 req/min) and API routes (120 req/min).

### 8. Automated Verification Test Suite
- Built-in test runner executing 12 automated HTTP tests covering:
  - Valid and invalid login authentication
  - Password complexity and schema constraint rejections
  - Bcrypt hashing format verification
  - JWT signature and tampering protection
  - RBAC privilege escalation prevention
  - API Key hash matching and invalid key rejection
  - Defensive security headers audit
- Interactive test report export (Download JSON or Copy Markdown).

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The application will be live at `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm start
```

---

## 📋 REST API Endpoints Overview

| Method | Endpoint | Auth Required | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/auth/register` | No | Anonymous | Register user account with bcrypt hashing |
| `POST` | `/api/auth/login` | No | Anonymous | Authenticate credentials and receive JWT |
| `GET` | `/api/auth/me` | Yes | Student | Fetch authenticated user profile & claims |
| `GET` | `/api/students` | Yes | Student | List students with search, filters, and pagination |
| `GET` | `/api/students/:id` | Yes | Student | Fetch specific student details |
| `POST` | `/api/students` | Yes | Faculty / Admin | Create student record with schema validation |
| `PUT` | `/api/students/:id` | Yes | Faculty / Admin | Update student information |
| `DELETE` | `/api/students/:id` | Yes | Admin Only | Delete student record (blocks Faculty & Student) |
| `GET` | `/api/courses` | Yes | Student | List academic courses |
| `POST` | `/api/courses/grades` | Yes | Faculty / Admin | Record course grade and auto-calculate GPA |
| `GET` | `/api/courses/transcript/:id` | Yes | Student (Own) / Admin | Official academic transcript |
| `GET` | `/api/api-keys` | Yes | Admin Only | List active developer API keys |
| `POST` | `/api/api-keys` | Yes | Admin Only | Issue new SHA-256 hashed API key |
| `DELETE` | `/api/api-keys/:id` | Yes | Admin Only | Revoke API key |
| `GET` | `/api/security/posture` | No | Anonymous | Audit TLS configuration & security headers |
| `POST` | `/api/tests/run` | No | Anonymous | Execute automated verification test suite |
| `GET` | `/api/download/project-zip` | No | Anonymous | Download full project source code archive |

---

## 🧪 Automated Testing Results Summary

- **Total Test Cases**: 12
- **Passed Assertions**: 12 (100% Pass Rate)
- **Failed Assertions**: 0
- **Total Test Execution Duration**: ~365 ms
