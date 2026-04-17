import { z } from "zod";

const sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Password must be a SHA-256 hash");

const ivHexSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "IV must be 12 bytes hex");

const saltHexSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/i, "Salt must be 16 bytes hex");

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: sha256HexSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: sha256HexSchema,
});

export const uploadMetadataSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255),
  size: z.coerce.number().int().positive("File size must be positive"),
  iv: ivHexSchema,
  salt: saltHexSchema,
});

export const createTokenSchema = z.object({
  fileId: z.number().int().positive(),
  expiryHours: z.number().min(1).max(72),
  maxAttempts: z.number().int().min(1).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
