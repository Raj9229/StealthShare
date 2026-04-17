import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { decryptFile, saveFile, formatFileSize } from "@/lib/crypto";
import {
  Shield,
  Download,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface FileInfo {
  filename: string;
  size: number;
  iv: string;
  salt: string;
  attemptsRemaining: number;
  expiryTime: string;
}

function getTimeRemainingLabel(expiryTime: string): string {
  const diff = new Date(expiryTime).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours <= 0) {
    return `${minutes}m remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid download link.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    api.tokens
      .getInfo(token)
      .then((response) => {
        if (isMounted) {
          setFileInfo(response);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Link unavailable.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const timeRemaining = useMemo(() => {
    if (!fileInfo) return "";
    return getTimeRemainingLabel(fileInfo.expiryTime);
  }, [fileInfo]);

  const handleDecrypt = useCallback(async () => {
    if (!token || !password || !fileInfo) return;

    setDecrypting(true);
    setStatus("Downloading encrypted file...");
    setError("");

    try {
      const encryptedData = await api.tokens.download(token);
      setStatus("Decrypting file securely in browser...");

      const decryptedData = await decryptFile(
        encryptedData,
        password,
        fileInfo.iv,
        fileInfo.salt
      );

      saveFile(decryptedData, fileInfo.filename);

      setStatus("");
      setSuccess(true);
      setPassword("");
      setFileInfo((prev) =>
        prev ? { ...prev, attemptsRemaining: Math.max(0, prev.attemptsRemaining - 1) } : null
      );
    } catch (err: any) {
      if (err.message?.includes("decrypt") || err.message?.includes("operation")) {
        setError("Incorrect password. Please try again.");
      } else {
        setError(err.message || "Download failed.");
      }
      setStatus("");
    } finally {
      setDecrypting(false);
    }
  }, [fileInfo, password, token]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-1.5 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            StealthShare
          </div>
        </div>

        <section className="surface-card subtle-enter rounded-3xl p-6 sm:p-7">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Secure file download</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Decrypt and download safely in your browser. The server never has access to your password.
          </p>

          {loading ? (
            <div className="mt-6 space-y-4" aria-live="polite">
              <div className="h-16 w-full rounded-2xl bg-secondary skeleton-box"></div>
              <div className="h-11 w-full rounded-xl bg-secondary skeleton-box"></div>
              <div className="h-11 w-full rounded-xl bg-secondary skeleton-box"></div>
            </div>
          ) : error && !fileInfo ? (
            <div className="mt-6 rounded-2xl border border-destructive/35 bg-destructive/10 p-5 text-destructive-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Link unavailable</p>
                  <p className="mt-1 text-sm text-destructive-foreground/90">{error}</p>
                </div>
              </div>
            </div>
          ) : fileInfo ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground sm:text-base">{fileInfo.filename}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{formatFileSize(fileInfo.size)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {timeRemaining}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1">
                        <Download className="h-3.5 w-3.5" />
                        {fileInfo.attemptsRemaining} attempts left
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {success ? (
                <div className="rounded-2xl border border-success/40 bg-success/15 p-4 text-[#b9fbc8]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">File decrypted and downloaded</p>
                      <p className="mt-1 text-sm text-[#b9fbc8]/85">Check your downloads folder.</p>
                    </div>
                  </div>

                  {fileInfo.attemptsRemaining > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(false);
                        setError("");
                      }}
                      className="btn-secondary mt-4 px-3 py-2 text-sm"
                    >
                      Download again
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {error && (
                    <div className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      <Lock className="mr-1 inline h-3.5 w-3.5" />
                      Decryption password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && password && !decrypting) {
                            void handleDecrypt();
                          }
                        }}
                        placeholder="Enter the shared password"
                        className="input-base pr-11"
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
                    type="button"
                    onClick={() => void handleDecrypt()}
                    disabled={!password || decrypting}
                    className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {decrypting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {status}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Decrypt & Download
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">
                    Encryption and decryption run locally in your browser session.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}