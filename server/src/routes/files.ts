import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db } from "../db/index.js";
import { files, accessTokens, uploadMetadataSchema } from "@stealthshare/shared";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, _file, cb) => {
    const uniqueName = crypto.randomBytes(32).toString("hex");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Upload encrypted file
router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const parsed = uploadMetadataSchema.safeParse(req.body);
    if (!parsed.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid upload metadata" });
      return;
    }

    const { filename, size, iv, salt } = parsed.data;

    const [file] = await db
      .insert(files)
      .values({
        userId: req.session.userId!,
        filename,
        size,
        encryptedFilePath: req.file.filename,
        iv,
        salt,
      })
      .returning();

    res.status(201).json({
      id: file.id,
      filename: file.filename,
      size: file.size,
      uploadDate: file.uploadDate,
    });
  } catch (error) {
    console.error("Upload error:", error);
    // Clean up uploaded file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// List user's files
router.get("/", requireAuth, async (req, res) => {
  try {
    const userFiles = await db
      .select({
        id: files.id,
        filename: files.filename,
        size: files.size,
        uploadDate: files.uploadDate,
        downloadsCount: files.downloadsCount,
      })
      .from(files)
      .where(eq(files.userId, req.session.userId!))
      .orderBy(desc(files.uploadDate));

    res.json(userFiles);
  } catch (error) {
    console.error("List files error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a file
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const fileId = parseInt(rawId, 10);

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, req.session.userId!)))
      .limit(1);

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Delete associated tokens
    await db.delete(accessTokens).where(eq(accessTokens.fileId, fileId));

    // Delete from DB
    await db.delete(files).where(eq(files.id, fileId));

    // Delete from disk
    const filePath = path.join(uploadsDir, file.encryptedFilePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
