import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  filename: text("filename").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  encryptedFilePath: text("encrypted_file_path").notNull(),
  iv: text("iv").notNull(),
  salt: text("salt").notNull(),
  maxDownloads: integer("max_downloads").default(100).notNull(),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  expiryTime: timestamp("expiry_time"),
  selfDestruct: boolean("self_destruct").default(true).notNull(),
});

export const accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id")
    .references(() => files.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiryTime: timestamp("expiry_time").notNull(),
  maxAttempts: integer("max_attempts").notNull(),
  attemptsUsed: integer("attempts_used").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type FileRecord = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;
