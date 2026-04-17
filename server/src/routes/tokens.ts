import { Router } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { db } from "../db/index.js";
import { accessTokens, files, createTokenSchema } from "@stealthshare/shared";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const uploadsDir = path.resolve(process.cwd(), "../uploads");

// Create a share token (authenticated)
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { fileId, expiryHours, maxAttempts } = parsed.data;

    // Verify the file belongs to the user
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, req.session.userId!)))
      .limit(1);

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Keep file-level lifecycle as strict as the strictest active token.
    const nextFileExpiry = file.expiryTime && file.expiryTime < expiryTime ? file.expiryTime : expiryTime;
    const nextMaxDownloads = Math.min(file.maxDownloads, maxAttempts);

    await db
      .update(files)
      .set({
        expiryTime: nextFileExpiry,
        maxDownloads: nextMaxDownloads,
        selfDestruct: true,
      })
      .where(eq(files.id, fileId));

    const [accessToken] = await db
      .insert(accessTokens)
      .values({
        fileId,
        token,
        expiryTime,
        maxAttempts,
      })
      .returning();

    res.status(201).json({
      id: accessToken.id,
      token: accessToken.token,
      expiryTime: accessToken.expiryTime,
      maxAttempts: accessToken.maxAttempts,
    });
  } catch (error) {
    console.error("Create token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get file info by token (public)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [accessToken] = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.token, token))
      .limit(1);

    if (!accessToken) {
      res.status(404).json({ error: "Invalid or expired download link" });
      return;
    }

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, accessToken.fileId))
      .limit(1);

    if (!file) {
      res.status(404).json({ error: "File no longer exists" });
      return;
    }

    if (
      file.selfDestruct &&
      ((file.expiryTime && new Date() > file.expiryTime) || file.downloadsCount >= file.maxDownloads)
    ) {
      await selfDestructFile(file.id);
      res.status(410).json({ error: "File has self-destructed" });
      return;
    }

    // Check expiry
    if (new Date() > accessToken.expiryTime) {
      await selfDestructFile(accessToken.fileId);
      res.status(410).json({ error: "Download link has expired" });
      return;
    }

    // Check attempts
    if (accessToken.attemptsUsed >= accessToken.maxAttempts) {
      await selfDestructFile(accessToken.fileId);
      res.status(410).json({ error: "Download limit reached" });
      return;
    }

    res.json({
      filename: file.filename,
      size: file.size,
      iv: file.iv,
      salt: file.salt,
      attemptsRemaining: accessToken.maxAttempts - accessToken.attemptsUsed,
      expiryTime: accessToken.expiryTime,
    });
  } catch (error) {
    console.error("Get token info error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Download encrypted file by token (public)
router.get("/:token/download", async (req, res) => {
  try {
    const { token } = req.params;

    const [accessToken] = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.token, token))
      .limit(1);

    if (!accessToken) {
      res.status(404).json({ error: "Invalid download link" });
      return;
    }

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, accessToken.fileId))
      .limit(1);

    if (!file) {
      res.status(404).json({ error: "File no longer exists" });
      return;
    }

    if (
      file.selfDestruct &&
      ((file.expiryTime && new Date() > file.expiryTime) || file.downloadsCount >= file.maxDownloads)
    ) {
      await selfDestructFile(file.id);
      res.status(410).json({ error: "File has self-destructed" });
      return;
    }

    if (new Date() > accessToken.expiryTime) {
      await selfDestructFile(accessToken.fileId);
      res.status(410).json({ error: "Download link has expired" });
      return;
    }

    if (accessToken.attemptsUsed >= accessToken.maxAttempts) {
      await selfDestructFile(accessToken.fileId);
      res.status(410).json({ error: "Download limit reached" });
      return;
    }

    const filePath = path.join(uploadsDir, file.encryptedFilePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    // Increment attempt count
    await db
      .update(accessTokens)
      .set({ attemptsUsed: accessToken.attemptsUsed + 1 })
      .where(eq(accessTokens.id, accessToken.id));

    // Increment downloads count on the file
    const nextDownloadsCount = file.downloadsCount + 1;
    await db
      .update(files)
      .set({ downloadsCount: nextDownloadsCount })
      .where(eq(files.id, file.id));

    // Check if self-destruct should trigger after this download
    const newAttemptsUsed = accessToken.attemptsUsed + 1;
    const shouldSelfDestruct =
      file.selfDestruct &&
      (newAttemptsUsed >= accessToken.maxAttempts || nextDownloadsCount >= file.maxDownloads);

    if (shouldSelfDestruct) {
      // Schedule self-destruct after response is sent
      res.on("finish", () => {
        selfDestructFile(accessToken.fileId).catch(console.error);
      });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", fs.statSync(filePath).size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Self-destruct: delete file from disk + DB (and all associated tokens)
async function selfDestructFile(fileId: number) {
  try {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return;
    }

    const filePath = path.join(uploadsDir, file.encryptedFilePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.delete(accessTokens).where(eq(accessTokens.fileId, fileId));
    await db.delete(files).where(eq(files.id, fileId));
    console.log(`Self-destruct: File ${file.filename} deleted`);
  } catch (error) {
    console.error("Self-destruct error:", error);
  }
}

export default router;
