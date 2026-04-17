import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Lock, Eye, EyeOff, UserPlus, LogIn, CheckCircle2 } from "lucide-react";

const highlights = [
  "End-to-end encryption in browser",
  "Zero-knowledge file storage",
  "Time-limited secure share links",
  "Self-destruct download controls",
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await register(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="surface-card subtle-enter rounded-3xl p-6 sm:p-8 lg:p-10">
          <div className="pill mb-4">Private file exchange</div>
          <div className="inline-flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              StealthShare
            </p>
          </div>

          <h1 className="hero-title mt-6 text-3xl font-extrabold leading-tight sm:text-4xl">
            Share sensitive files without exposing your data.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] text-muted-foreground sm:text-base">
            Upload, encrypt, and control every download from one clean dashboard.
            Encryption keys stay in your browser, so your documents remain private by design.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={item}
                className="surface-muted rounded-2xl px-4 py-3 text-sm text-foreground"
              >
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground">
            <Lock className="mr-1 inline h-4 w-4 text-primary" />
            Passwords for files are never sent to the server in plaintext.
          </div>
        </section>

        <section className="surface-card subtle-enter rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-foreground">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin
              ? "Sign in to manage encrypted uploads and secure share links."
              : "Start securing files with client-side encryption in minutes."}
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-base"
                autoComplete="username"
                placeholder="Enter your username"
              />
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-base"
                  autoComplete="email"
                  placeholder="Enter your email"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-base pr-12"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="icon-button absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex w-full items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-primary-foreground/35 border-t-primary-foreground animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isLogin
                ? "Need an account? Create one"
                : "Already registered? Sign in"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Lock className="mr-1 inline h-3.5 w-3.5" />
            Credentials are hashed in your browser before transmission.
          </p>
        </section>
      </div>
    </div>
  );
}
