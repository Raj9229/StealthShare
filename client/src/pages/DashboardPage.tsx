import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { encryptFile, formatFileSize } from "@/lib/crypto";
import {
  Plus,
  Trash2,
  Share2,
  Copy,
  Check,
  X,
  Clock3,
  Download,
  Shield,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Files,
  HardDrive,
  Activity,
} from "lucide-react";

interface FileItem {
  id: number;
  filename: string;
  size: number;
  uploadDate: string;
  downloadsCount: number;
}

type BannerState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface FileRowProps {
  file: FileItem;
  onShare: (id: number) => void;
  onDelete: (id: number) => void;
}

function FileSkeletons() {
  return (
    <div className="space-y-3" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="file-row-surface skeleton-box flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary"></div>
          <div className="min-w-0 w-full flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-secondary"></div>
            <div className="flex gap-2">
              <div className="h-3 w-16 rounded bg-secondary"></div>
              <div className="h-3 w-24 rounded bg-secondary"></div>
              <div className="h-3 w-12 rounded bg-secondary"></div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 self-start sm:self-auto">
            <div className="h-9 w-20 rounded-xl bg-secondary"></div>
            <div className="h-9 w-9 rounded-xl bg-secondary"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

const FileRow = memo(function FileRow({ file, onShare, onDelete }: FileRowProps) {
  return (
    <article className="file-row-surface subtle-enter flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{file.filename}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {file.downloadsCount} downloads
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onShare(file.id)}
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button
          type="button"
          onClick={() => onDelete(file.id)}
          className="btn-danger inline-flex h-9 w-9 items-center justify-center"
          aria-label={`Delete ${file.filename}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
});

export default function DashboardPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [encPassword, setEncPassword] = useState("");
  const [showEncPassword, setShowEncPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  const [shareFileId, setShareFileId] = useState<number | null>(null);
  const [shareExpiryHours, setShareExpiryHours] = useState(24);
  const [shareMaxAttempts, setShareMaxAttempts] = useState(10);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const loadFiles = useCallback(async (showLoadingState = false) => {
    if (showLoadingState) {
      setLoadingFiles(true);
    }

    try {
      const data = await api.files.list();
      setFiles(data);
    } catch (err) {
      console.error("Failed to load files:", err);
      setBanner({ type: "error", message: "Could not refresh your file list." });
    } finally {
      if (showLoadingState) {
        setLoadingFiles(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadFiles(true);
  }, [loadFiles]);

  const totalStorage = useMemo(
    () => files.reduce((acc, file) => acc + file.size, 0),
    [files]
  );
  const totalDownloads = useMemo(
    () => files.reduce((acc, file) => acc + file.downloadsCount, 0),
    [files]
  );

  const selectedFileName = selectedFile?.name ?? "";
  const shareFileName = useMemo(() => {
    if (!shareFileId) return "";
    return files.find((file) => file.id === shareFileId)?.filename ?? "Selected file";
  }, [files, shareFileId]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setBanner(null);
      setUploadProgress("");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setBanner(null);
      setUploadProgress("");
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !encPassword) return;

    if (encPassword.length < 6) {
      setBanner({
        type: "error",
        message: "Use at least 6 characters for file encryption password.",
      });
      return;
    }

    setBanner(null);
    setUploading(true);
    setUploadProgress("Encrypting file in browser...");

    try {
      const { encryptedBlob, iv, salt } = await encryptFile(selectedFile, encPassword);
      setUploadProgress("Uploading encrypted file...");

      const formData = new FormData();
      formData.append("file", encryptedBlob);
      formData.append("filename", selectedFile.name);
      formData.append("size", selectedFile.size.toString());
      formData.append("iv", iv);
      formData.append("salt", salt);

      await api.files.upload(formData);
      setSelectedFile(null);
      setEncPassword("");
      setUploadProgress("");
      setBanner({ type: "success", message: `Encrypted and uploaded ${selectedFile.name}.` });
      await loadFiles();
    } catch (err: any) {
      setUploadProgress("");
      setBanner({ type: "error", message: err.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }, [encPassword, loadFiles, selectedFile]);

  const handleDelete = useCallback(
    async (id: number) => {
      const fileName = files.find((file) => file.id === id)?.filename ?? "this file";
      const shouldDelete = window.confirm(
        `Delete ${fileName}? This action cannot be undone.`
      );
      if (!shouldDelete) return;

      try {
        await api.files.delete(id);
        setBanner({ type: "info", message: `${fileName} deleted.` });
        await loadFiles();
      } catch (err: any) {
        setBanner({ type: "error", message: err.message || "Failed to delete file." });
      }
    },
    [files, loadFiles]
  );

  const openShareDialog = useCallback((fileId: number) => {
    setShareFileId(fileId);
    setShareLink("");
    setCopied(false);
  }, []);

  const closeShareDialog = useCallback(() => {
    setShareFileId(null);
    setShareLink("");
    setCopied(false);
    setShareLoading(false);
  }, []);

  const handleCreateToken = useCallback(async () => {
    if (!shareFileId) return;

    setShareLoading(true);
    setShareLink("");

    try {
      const result = await api.tokens.create({
        fileId: shareFileId,
        expiryHours: shareExpiryHours,
        maxAttempts: shareMaxAttempts,
      });
      setShareLink(`${window.location.origin}/download/${result.token}`);
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Could not generate share link." });
    } finally {
      setShareLoading(false);
    }
  }, [shareExpiryHours, shareFileId, shareMaxAttempts]);

  const copyLink = useCallback(async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setBanner({ type: "error", message: "Clipboard access blocked. Copy link manually." });
    }
  }, [shareLink]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="hero-title text-lg font-extrabold">StealthShare</p>
              <p className="text-xs text-muted-foreground">Encrypted file workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted-foreground sm:block">
              Signed in as <span className="font-semibold text-foreground">{user?.username}</span>
            </p>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
        <section className="subtle-enter mb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Secure Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Upload encrypted files, manage download history, and generate private links with expiry controls.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total files</span>
              <Files className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{files.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Encrypted storage</span>
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{formatFileSize(totalStorage)}</p>
          </div>
          <div className="stat-card sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total downloads</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{totalDownloads}</p>
          </div>
        </section>

        {banner && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-success/40 bg-success/15 text-[#b9fbc8]"
                : banner.type === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
                : "border-primary/35 bg-primary/10 text-[#c4f3ec]"
            }`}
            role="status"
          >
            {banner.message}
          </div>
        )}

        <section className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="surface-card subtle-enter rounded-3xl p-5 sm:p-6 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Upload & Encrypt</h2>
              <span className="pill">Browser-side AES-256</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border border-dashed p-5 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/10"
                  : selectedFileName
                  ? "border-success/45 bg-success/10"
                  : "border-border bg-secondary/25"
              }`}
              aria-label="Select file to upload"
            >
              {selectedFile ? (
                <>
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <p className="truncate text-sm font-semibold text-foreground">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Drop file or tap to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">Any file type, up to 100 MB</p>
                </>
              )}
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="btn-secondary mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <X className="h-3.5 w-3.5" />
                Remove file
              </button>
            )}

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                <Lock className="mr-1 inline h-3.5 w-3.5" />
                Encryption password
              </label>
              <div className="relative">
                <input
                  type={showEncPassword ? "text" : "password"}
                  value={encPassword}
                  onChange={(e) => setEncPassword(e.target.value)}
                  className="input-base pr-11"
                  placeholder="Use a strong private key"
                />
                <button
                  type="button"
                  onClick={() => setShowEncPassword((prev) => !prev)}
                  className="icon-button absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
                  aria-label={showEncPassword ? "Hide encryption password" : "Show encryption password"}
                >
                  {showEncPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {uploadProgress && <p className="mt-3 text-xs text-primary">{uploadProgress}</p>}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || !encPassword || uploading}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {uploading ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Encrypt & Upload
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-muted-foreground">
              Keep this password safe. Recipients need the same password to decrypt downloads.
            </p>
          </aside>

          <section className="surface-card subtle-enter rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">Your encrypted files</h2>
              <span className="pill">{files.length} items</span>
            </div>

            {loadingFiles ? (
              <FileSkeletons />
            ) : files.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-5 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">No files yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start by uploading a file from the panel on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onShare={openShareDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      </main>

      {shareFileId !== null && (
        <div
          className="overlay-panel fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeShareDialog}
        >
          <div
            className="surface-card subtle-enter w-full max-w-lg rounded-3xl p-6 sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Secure share</p>
                <h3 className="mt-1 text-xl font-bold text-foreground">Create download link</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">{shareFileName}</p>
              </div>
              <button
                type="button"
                onClick={closeShareDialog}
                className="icon-button h-9 w-9 rounded-xl"
                aria-label="Close share dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!shareLink ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                    Expiry: {shareExpiryHours} hour{shareExpiryHours === 1 ? "" : "s"}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={72}
                    value={shareExpiryHours}
                    onChange={(e) => setShareExpiryHours(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>1h</span>
                    <span>72h</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    <Download className="mr-1 inline h-3.5 w-3.5" />
                    Max downloads: {shareMaxAttempts}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={shareMaxAttempts}
                    onChange={(e) => setShareMaxAttempts(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>100</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateToken}
                  disabled={shareLoading}
                  className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {shareLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Generate secure link
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-success/40 bg-success/15 p-3 text-sm text-[#b9fbc8]">
                  Link generated. Share it with the password through a separate secure channel.
                </div>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="input-base truncate font-mono text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="btn-secondary inline-flex h-11 w-11 items-center justify-center"
                    aria-label="Copy generated link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="rounded-xl border border-border/70 bg-secondary/25 p-3 text-xs text-muted-foreground">
                  Expires in {shareExpiryHours} hours with {shareMaxAttempts} allowed downloads.
                </div>

                <button
                  type="button"
                  onClick={closeShareDialog}
                  className="btn-secondary w-full px-4 py-2.5"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const LogoutButton = memo(function LogoutButton() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Logout"}
    </button>
  );
});