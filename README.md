<p align="center">
  <img src="https://img.shields.io/badge/🛡️-StealthShare-0891b2?style=for-the-badge&labelColor=0a0a1a" alt="StealthShare" />
</p>

<h1 align="center">StealthShare</h1>

<p align="center">
  <strong>End-to-End Encrypted File Sharing Platform</strong>
</p>

<p align="center">
  <em>Upload. Encrypt. Share. Self-Destruct.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Web_Crypto_API-FF6F00?style=flat-square&logo=letsencrypt&logoColor=white" alt="Web Crypto API" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Encryption Workflow](#-encryption-workflow)
- [System Flow Diagrams](#-system-flow-diagrams)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Security Model](#-security-model)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**StealthShare** is a full-stack, end-to-end encrypted file sharing platform where all cryptographic operations happen **exclusively in the browser**. The server never sees plaintext files or encryption passwords — it only stores opaque, encrypted blobs.

Users can upload files that are encrypted client-side using **AES-256-GCM** with **PBKDF2** key derivation, then generate time-limited, download-capped share links. Files automatically **self-destruct** once their share constraints expire — making StealthShare ideal for sharing sensitive documents, credentials, or confidential media.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **Client-Side Encryption** | AES-256-GCM encryption happens entirely in the browser via Web Crypto API |
| 🔑 **PBKDF2 Key Derivation** | 100,000-iteration PBKDF2-SHA256 with random 16-byte salt per file |
| 🔗 **Shareable Links** | Generate time-limited, download-capped share URLs |
| 💣 **Self-Destruct** | Files automatically delete from disk & database when limits are reached |
| 🧂 **Zero-Knowledge Server** | Server stores only encrypted blobs — never sees plaintext or passwords |
| 🛡️ **Session Auth** | Secure cookie-based sessions with SHA-256 hashed passwords |
| 📦 **Drag & Drop Upload** | Intuitive drag-and-drop file upload with progress indicators |
| 🎨 **Premium Dark UI** | Glassmorphism design with animated gradients and micro-interactions |
| 📱 **Responsive** | Fully responsive layout from mobile to desktop |

---

## 🏗 Architecture

StealthShare uses a **monorepo** structure with three packages:

```
┌─────────────────────────────────────────────────────────┐
│                      MONOREPO ROOT                      │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  client/  │    │  server/  │    │     shared/      │   │
│  │  (React)  │◄──►│ (Express) │◄──►│ (Schema + Zod)   │   │
│  └──────────┘    └──────────┘    └──────────────────┘   │
│       │                │                                 │
│       │ Vite :5173     │ Express :3000                   │
│       │                │                                 │
│       ▼                ▼                                 │
│   Browser          PostgreSQL                           │
│  (Web Crypto)       (Neon DB)                           │
└─────────────────────────────────────────────────────────┘
```

| Package | Role |
|---|---|
| `client/` | React 19 + Vite + Tailwind CSS 4 frontend. Handles all UI, encryption/decryption via Web Crypto API |
| `server/` | Express 4 REST API backend. Manages auth, file storage, token generation, and self-destruct logic |
| `shared/` | Shared Drizzle ORM schema definitions + Zod validation schemas used by both client and server |

---

## 🔐 Encryption Workflow

### Upload & Encrypt Flow

```
  User selects file + enters password
                │
                ▼
  ┌──────────────────────────┐
  │   Generate random IV     │  (12 bytes)
  │   Generate random Salt   │  (16 bytes)
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   PBKDF2 Key Derivation  │
  │   Password + Salt         │
  │   100,000 iterations      │
  │   SHA-256 → AES-256 Key  │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   AES-256-GCM Encrypt    │
  │   Plaintext + Key + IV    │
  │   → Ciphertext + AuthTag │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   Upload to Server        │
  │   Encrypted Blob          │
  │   + IV (hex) + Salt (hex) │
  │   + Original filename     │
  └──────────────────────────┘
```

### Download & Decrypt Flow

```
  Recipient opens share link
                │
                ▼
  ┌──────────────────────────┐
  │   Validate Token          │
  │   Check: expiry, attempts │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   Download encrypted blob │
  │   Retrieve IV + Salt      │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   Enter decryption        │
  │   password in browser     │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   PBKDF2 → AES-256 Key   │
  │   AES-256-GCM Decrypt     │
  │   → Original plaintext    │
  └──────────────────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │   Save decrypted file     │
  │   to user's device        │
  └──────────────────────────┘
```

---

## 📊 System Flow Diagrams

### User Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant DB as PostgreSQL

    B->>B: SHA-256 hash password (client-side)
    B->>S: POST /api/auth/register {username, email, hash}
    S->>DB: Check username/email uniqueness
    S->>DB: INSERT user with hashed password
    S->>B: Set session cookie + return user
    
    Note over B,S: Subsequent requests include session cookie
    
    B->>S: GET /api/auth/me
    S->>S: Validate session
    S->>B: Return current user
```

### File Upload Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant WC as Web Crypto API
    participant S as Server
    participant FS as File System
    participant DB as PostgreSQL

    B->>WC: Generate random IV (12B) + Salt (16B)
    WC->>WC: PBKDF2(password, salt) → AES-256 key
    WC->>WC: AES-256-GCM encrypt(file, key, iv)
    WC-->>B: Encrypted blob + IV + Salt

    B->>S: POST /api/files/upload (multipart)
    Note right of B: FormData: file blob, filename, size, iv, salt
    S->>S: Validate metadata (Zod)
    S->>FS: Write encrypted blob to /uploads/
    S->>DB: INSERT file record
    S-->>B: 201 Created {id, filename, size}
```

### Share & Download Flow

```mermaid
sequenceDiagram
    participant Owner as File Owner
    participant S as Server
    participant DB as PostgreSQL
    participant R as Recipient
    participant WC as Web Crypto API

    Owner->>S: POST /api/tokens {fileId, expiryHours, maxAttempts}
    S->>DB: INSERT access_token with expiry + limits
    S-->>Owner: {token, expiryTime}
    Owner->>Owner: Copy share link to clipboard

    Note over Owner,R: Owner sends link to recipient out-of-band

    R->>S: GET /api/tokens/:token
    S->>DB: Validate token (expiry, attempts)
    S-->>R: {filename, size, iv, salt, attemptsRemaining}

    R->>S: GET /api/tokens/:token/download
    S->>DB: Increment attempts + downloads count
    S-->>R: Encrypted file stream

    R->>WC: PBKDF2(password, salt) → AES key
    WC->>WC: AES-256-GCM decrypt(ciphertext, key, iv)
    WC-->>R: Plaintext file → Save to disk

    alt Self-Destruct triggered
        S->>DB: DELETE access_tokens WHERE fileId
        S->>DB: DELETE files WHERE id
        S->>S: Unlink file from disk
    end
```

### Self-Destruct Logic

```mermaid
flowchart TD
    A[Download Request] --> B{Token Valid?}
    B -->|No| C[404 / 410 Error]
    B -->|Yes| D{File Expired?}
    D -->|Yes| E[🔥 Self-Destruct]
    D -->|No| F{Downloads >= Max?}
    F -->|Yes| E
    F -->|No| G[Serve Encrypted File]
    G --> H[Increment Counters]
    H --> I{Limits Hit After?}
    I -->|Yes| J[Schedule Self-Destruct on Response Finish]
    I -->|No| K[Done]
    
    E --> L[Delete from Disk]
    E --> M[Delete Tokens from DB]
    E --> N[Delete File Record from DB]

    style E fill:#ef4444,stroke:#dc2626,color:#fff
    style J fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#10b981,stroke:#059669,color:#fff
```

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI component library |
| **TypeScript** | Type-safe development |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **React Router 6** | Client-side routing |
| **Radix UI** | Accessible UI primitives |
| **Lucide React** | Icon library |
| **Web Crypto API** | Client-side AES-256-GCM encryption |
| **Zod** | Runtime input validation |

### Backend

| Technology | Purpose |
|---|---|
| **Express 4** | HTTP server framework |
| **TypeScript** | Type-safe development |
| **Drizzle ORM** | Type-safe database queries |
| **PostgreSQL** | Relational database (Neon serverless) |
| **Multer** | Multipart file upload handling |
| **express-session** | Cookie-based session management |
| **Zod** | Request validation |
| **tsx** | TypeScript execution for development |

---

## 📁 Project Structure

```
stealthshare/
├── .env                          # Root environment variables (DB URL, secrets)
├── .env.example                  # Template for environment setup
├── .gitignore
├── package.json                  # Monorepo root with dev scripts
├── tsconfig.base.json            # Shared TypeScript configuration
│
├── client/                       # ⚛️ React Frontend
│   ├── index.html                # HTML entry point
│   ├── vite.config.ts            # Vite config with Tailwind + proxy
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Router + auth guards
│       ├── index.css             # Tailwind theme + glassmorphism styles
│       ├── contexts/
│       │   └── AuthContext.tsx    # Auth state management
│       ├── lib/
│       │   ├── api.ts            # Typed API client
│       │   ├── crypto.ts         # AES-256-GCM encryption/decryption
│       │   └── utils.ts          # Tailwind class merge utility
│       └── pages/
│           ├── AuthPage.tsx      # Login / Register page
│           ├── DashboardPage.tsx # File management dashboard
│           └── DownloadPage.tsx  # Public download + decrypt page
│
├── server/                       # 🖥️ Express Backend
│   ├── drizzle.config.ts         # Drizzle Kit configuration
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts              # Express app bootstrap
│       ├── db/
│       │   └── index.ts          # PostgreSQL pool + Drizzle + migrations
│       ├── middleware/
│       │   └── auth.ts           # Session auth middleware
│       └── routes/
│           ├── auth.ts           # Register / Login / Logout / Me
│           ├── files.ts          # Upload / List / Delete files
│           └── tokens.ts         # Create / Validate / Download tokens
│
├── shared/                       # 📦 Shared Package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Re-exports
│       ├── schema.ts             # Drizzle table definitions
│       └── validation.ts         # Zod validation schemas
│
└── uploads/                      # 📂 Encrypted file storage (gitignored)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** database (local or cloud — [Neon](https://neon.tech) recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stealthshare.git
cd stealthshare
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://user:password@host:5432/stealthshare
SESSION_SECRET=your-long-random-secret-key-here
PORT=3000
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies  
cd server && npm install && cd ..

# Install shared dependencies
cd shared && npm install && cd ..
```

### 4. Set Up Database

```bash
# Push schema to database
npm run db:push
```

### 5. Run the Application

```bash
npm run dev
```

This starts both servers concurrently:
- **Client** → `http://localhost:5173` (Vite dev server)
- **Server** → `http://localhost:3000` (Express API)

The Vite dev server proxies `/api/*` requests to the Express backend automatically.

### 6. Build for Production

```bash
npm run build
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | `fallback-secret-change-me` | Secret for signing session cookies |
| `PORT` | ❌ | `3000` | Port for the Express server |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create a new account |
| `POST` | `/api/auth/login` | Public | Log in with credentials |
| `POST` | `/api/auth/logout` | Session | Destroy session |
| `GET` | `/api/auth/me` | Session | Get current user |

#### `POST /api/auth/register`

```json
// Request
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "a1b2c3...64-char-sha256-hex"
}

// Response 201
{
  "id": 1,
  "username": "alice"
}
```

#### `POST /api/auth/login`

```json
// Request
{
  "username": "alice",
  "password": "a1b2c3...64-char-sha256-hex"
}

// Response 200
{
  "id": 1,
  "username": "alice"
}
```

---

### Files

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/files/upload` | Session | Upload an encrypted file |
| `GET` | `/api/files` | Session | List user's files |
| `DELETE` | `/api/files/:id` | Session | Delete a file |

#### `POST /api/files/upload`

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | Binary | The encrypted file blob |
| `filename` | String | Original filename |
| `size` | Number | Original file size in bytes |
| `iv` | String | 12-byte IV as 24-char hex |
| `salt` | String | 16-byte salt as 32-char hex |

```json
// Response 201
{
  "id": 5,
  "filename": "secret-doc.pdf",
  "size": 245760,
  "uploadDate": "2025-01-15T10:30:00.000Z"
}
```

---

### Access Tokens (Sharing)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tokens` | Session | Create a share token |
| `GET` | `/api/tokens/:token` | Public | Get file info by token |
| `GET` | `/api/tokens/:token/download` | Public | Download encrypted file |

#### `POST /api/tokens`

```json
// Request
{
  "fileId": 5,
  "expiryHours": 24,
  "maxAttempts": 10
}

// Response 201
{
  "id": 1,
  "token": "a1b2c3d4...64-char-hex",
  "expiryTime": "2025-01-16T10:30:00.000Z",
  "maxAttempts": 10
}
```

#### `GET /api/tokens/:token`

```json
// Response 200
{
  "filename": "secret-doc.pdf",
  "size": 245760,
  "iv": "1a2b3c4d5e6f7a8b9c0d1e2f",
  "salt": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "attemptsRemaining": 9,
  "expiryTime": "2025-01-16T10:30:00.000Z"
}
```

#### `GET /api/tokens/:token/download`

Returns: `application/octet-stream` — the raw encrypted file bytes.

---

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server health status |

```json
// Response 200
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 🗄 Database Schema

```mermaid
erDiagram
    USERS {
        serial id PK
        text username UK
        text password_hash
        text email UK
        boolean email_verified
        timestamp created_at
    }

    FILES {
        serial id PK
        integer user_id FK
        text filename
        bigint size
        timestamp upload_date
        text encrypted_file_path
        text iv
        text salt
        integer max_downloads
        integer downloads_count
        timestamp expiry_time
        boolean self_destruct
    }

    ACCESS_TOKENS {
        serial id PK
        integer file_id FK
        text token UK
        timestamp expiry_time
        integer max_attempts
        integer attempts_used
    }

    USERS ||--o{ FILES : "owns"
    FILES ||--o{ ACCESS_TOKENS : "has"
```

---

## 🔒 Security Model

### What StealthShare Guarantees

| Aspect | Implementation |
|---|---|
| **Encryption Algorithm** | AES-256-GCM (authenticated encryption) |
| **Key Derivation** | PBKDF2 with SHA-256, 100,000 iterations |
| **IV** | 12 random bytes per file (never reused) |
| **Salt** | 16 random bytes per file (unique per encryption) |
| **Password Hashing (auth)** | SHA-256 (hashed client-side before transmission) |
| **Session Security** | HttpOnly cookies, SameSite=Lax, 24hr expiry |
| **Zero-Knowledge** | Server never receives plaintext files or encryption passwords |
| **Self-Destruct** | Files deleted from disk + DB when limits expire |

### Threat Model

```
┌──────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY                     │
│                                                      │
│  ┌────────────┐              ┌──────────────────┐   │
│  │   Browser   │  Encrypted  │     Server       │   │
│  │             │────blob────▶│                  │   │
│  │ ✅ Plaintext│  IV + Salt  │ ❌ No plaintext  │   │
│  │ ✅ Password │────────────▶│ ❌ No password   │   │
│  │ ✅ AES Key  │             │ ❌ No AES key    │   │
│  └────────────┘              │ ✅ Encrypted blob│   │
│                              │ ✅ IV + Salt     │   │
│                              │ ✅ Auth hash     │   │
│                              └──────────────────┘   │
└──────────────────────────────────────────────────────┘
```

> **Note:** The encryption password must be shared out-of-band (e.g., in person, via a separate secure channel). The share link alone does not grant access to the plaintext.

---

## 🖼 Screenshots

| Auth Page | Dashboard | Share Dialog | Download Page |
|---|---|---|---|
| Dark glassmorphism login/register | File list with drag-drop upload | Time & download-limited share links | Token-validated decrypt & download |

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

### Development Guidelines

- Run `npm run dev` for hot-reloading development
- Shared types/schemas go in `shared/src/`
- Validate all API inputs with Zod schemas
- All crypto operations must use the Web Crypto API (never Node.js crypto on the client)

---

##  Support & Contact

If you encounter any issues or have questions regarding StealthShare, please feel free to:
- Open an issue on our [GitHub repository](https://github.com/Raj9229/stealthshare/issues).
- Reach out to the maintainers via email or community channels.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Built with 🔐 by <strong>StealthShare</strong> — Because privacy matters.</sub>
</p>
