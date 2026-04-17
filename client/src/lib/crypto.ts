/**
 * StealthShare Client-Side Cryptography
 * 
 * All encryption/decryption happens in the browser using Web Crypto API.
 * The server NEVER sees plaintext files or encryption passwords.
 * 
 * Algorithm: AES-256-GCM
 * Key Derivation: PBKDF2 with SHA-256, 100,000 iterations
 * IV: 12 bytes (random)
 * Salt: 16 bytes (random)
 */

/**
 * Derive an AES-256-GCM key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const normalizedSalt = new Uint8Array(salt);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: normalizedSalt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Convert a Uint8Array to a hex string
 */
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert a hex string to a Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export interface EncryptResult {
  encryptedBlob: Blob;
  iv: string; // hex
  salt: string; // hex
}

/**
 * Encrypt a file using AES-256-GCM with PBKDF2 key derivation.
 * 
 * @param file - The file to encrypt
 * @param password - The encryption password (user-provided)
 * @returns The encrypted blob, IV (hex), and Salt (hex)
 */
export async function encryptFile(
  file: File,
  password: string
): Promise<EncryptResult> {
  // Generate random IV (12 bytes) and Salt (16 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive AES-256-GCM key from password
  const key = await deriveKey(password, salt);

  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Encrypt with AES-256-GCM
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    fileBuffer
  );

  return {
    encryptedBlob: new Blob([encryptedBuffer]),
    iv: bufferToHex(iv),
    salt: bufferToHex(salt),
  };
}

/**
 * Decrypt an encrypted file using AES-256-GCM with PBKDF2 key derivation.
 * 
 * @param encryptedData - The encrypted file data as ArrayBuffer
 * @param password - The decryption password
 * @param ivHex - The IV used during encryption (hex string)
 * @param saltHex - The salt used during encryption (hex string)
 * @returns The decrypted file as ArrayBuffer
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  password: string,
  ivHex: string,
  saltHex: string
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(hexToBuffer(ivHex));
  const salt = new Uint8Array(hexToBuffer(saltHex));

  if (iv.length !== 12) {
    throw new Error("Invalid IV length");
  }
  if (salt.length !== 16) {
    throw new Error("Invalid salt length");
  }

  // Derive the same key from password + salt
  const key = await deriveKey(password, salt);

  // Decrypt with AES-256-GCM
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encryptedData
  );

  return decryptedBuffer;
}

/**
 * Hash a password using SHA-256.
 * Used for authentication (not file encryption).
 * 
 * @param password - The plaintext password
 * @returns SHA-256 hash as hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

/**
 * Trigger a browser file save dialog with the given data.
 * 
 * @param data - The file data as ArrayBuffer
 * @param filename - The filename for the download
 */
export function saveFile(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}
