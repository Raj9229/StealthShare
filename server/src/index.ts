import dotenv from "dotenv";
import path from "path";

// Always load from the monorepo root .env first
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config(); // fallback to local .env if any var is still missing

import express from "express";
import cors from "cors";
import session from "express-session";
import { runMigrations } from "./db/index.js";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import tokenRoutes from "./routes/tokens.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

// Middleware
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === "true"
  : isProduction;
const sessionSameSite = process.env.SESSION_COOKIE_SAMESITE || (isProduction ? "none" : "lax");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: sessionCookieSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: sessionSameSite as "lax" | "none" | "strict",
    },
  })
);

// Serve uploaded encrypted files statically is NOT needed
// (they are served through the token route)

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/tokens", tokenRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`⚡ StealthShare server running on port ${PORT}`);
      console.log(`   CORS origin: ${clientOrigin}`);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

void bootstrap();

export default app;
