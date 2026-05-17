# StealthShare Project Summary

## Overview
StealthShare is a full-stack, end-to-end encrypted file sharing app. All cryptography happens in the browser; the server only stores encrypted blobs and metadata. The codebase is a monorepo with three packages: client (React + Vite), server (Express + Drizzle), and shared (schema + validation).

## Architecture
- Client: React UI, session-aware routing, browser-side crypto, and API calls. Entry and routing are in [client/src/main.tsx](client/src/main.tsx) and [client/src/App.tsx](client/src/App.tsx).
- Server: Express API with session auth, file storage, and token-based downloads. Bootstrap is in [server/src/index.ts](server/src/index.ts).
- Shared: Drizzle schema and Zod validation shared by client and server in [shared/src/schema.ts](shared/src/schema.ts) and [shared/src/validation.ts](shared/src/validation.ts).

## Data Model
Defined in [shared/src/schema.ts](shared/src/schema.ts):
- users: username, email, password_hash (client-side SHA-256), created_at
- files: user_id, filename, size, encrypted_file_path, iv, salt, max_downloads, downloads_count, expiry_time, self_destruct
- access_tokens: file_id, token, expiry_time, max_attempts, attempts_used

## Authentication Flow
- Client hashes the password with SHA-256 using `hashPassword` before sending it to the server (see [client/src/lib/crypto.ts](client/src/lib/crypto.ts) and [client/src/contexts/AuthContext.tsx](client/src/contexts/AuthContext.tsx)).
- Server stores and compares the hashed value directly (see [server/src/routes/auth.ts](server/src/routes/auth.ts)).
- Session is managed with `express-session` cookies (see [server/src/index.ts](server/src/index.ts)) and enforced via `requireAuth` (see [server/src/middleware/auth.ts](server/src/middleware/auth.ts)).

## Encryption and Decryption Working
Implemented in [client/src/lib/crypto.ts](client/src/lib/crypto.ts):
- Key derivation: PBKDF2 with SHA-256, 100,000 iterations, salt size 16 bytes.
- Cipher: AES-256-GCM with a random 12-byte IV.
- `encryptFile` returns an encrypted Blob plus IV and salt in hex.
- `decryptFile` reconstructs the key from password + salt, then decrypts using AES-256-GCM.
- The server never sees the plaintext file or the encryption password.

## File Upload and Storage Flow
Client-side flow in [client/src/pages/DashboardPage.tsx](client/src/pages/DashboardPage.tsx):
1. User selects a file and enters an encryption password.
2. Browser encrypts the file with `encryptFile`.
3. Client uploads encrypted Blob plus filename, size, IV, and salt to the server.

Server-side flow in [server/src/routes/files.ts](server/src/routes/files.ts):
- `multer` stores the encrypted file in uploads/ with a random 32-byte hex filename.
- Metadata is validated via `uploadMetadataSchema` in [shared/src/validation.ts](shared/src/validation.ts).
- File record is saved in the database with IV and salt for later decryption.
- Upload size limit is 100 MB.

## Share Link and Token Flow
Implemented in [server/src/routes/tokens.ts](server/src/routes/tokens.ts):
- Authenticated users create a token by file id, expiry hours, and max attempts.
- A random 32-byte hex token is generated.
- File-level expiry and max downloads are tightened to the strictest active token.

Client usage in [client/src/pages/DashboardPage.tsx](client/src/pages/DashboardPage.tsx):
- The share link is composed as `/download/:token` for recipients.

## Download and Decryption Flow
Client-side flow in [client/src/pages/DownloadPage.tsx](client/src/pages/DownloadPage.tsx):
1. Client requests token info (filename, size, IV, salt, attempts remaining).
2. Client downloads the encrypted blob from the server.
3. Client decrypts locally with `decryptFile` using the shared password.
4. Browser saves the plaintext file via `saveFile`.

Server-side flow in [server/src/routes/tokens.ts](server/src/routes/tokens.ts):
- Token validity is checked (expiry and attempts).
- File download is streamed from uploads/ as an encrypted blob.
- Attempts and download counters are incremented per request.

## Self-Destruct Logic
Implemented in [server/src/routes/tokens.ts](server/src/routes/tokens.ts):
- If a file is expired or exceeds download limits, the server deletes the encrypted file from disk, removes tokens, and deletes the DB record.
- Self-destruct can also trigger after a successful download when limits are reached.

## API Surface (Selected)
Defined in [client/src/lib/api.ts](client/src/lib/api.ts) and implemented on the server:
- POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- POST /api/files/upload, GET /api/files, DELETE /api/files/:id
- POST /api/tokens, GET /api/tokens/:token, GET /api/tokens/:token/download

## Configuration
Environment variables in [/.env.example](.env.example):
- DATABASE_URL: Postgres connection string
- SESSION_SECRET: session cookie secret
- PORT: server port (default 3000)

## Scripts
Root scripts in [package.json](package.json):
- dev: runs client and server together
- build: builds client then server
- db:generate, db:push: Drizzle migration helpers

Client and server scripts are in [client/package.json](client/package.json) and [server/package.json](server/package.json).
