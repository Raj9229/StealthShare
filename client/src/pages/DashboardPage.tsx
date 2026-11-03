import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { encryptFile, formatFileSize } from "@/lib/crypto";
import {
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
  Search,
  RefreshCw,
  ArrowUpDown,
  UploadCloud,
  Link2,
  ShieldCheck,
  History,
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

type DashboardTab = "files" | "shared" | "activity" | "security";

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
  const [fileSearch, setFileSearch] = useState("");
  const [fileSort, setFileSort] = useState<"newest" | "largest" | "name">("newest");
  const [activeTab, setActiveTab] = useState<DashboardTab>("files");

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
  const visibleFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase();
    return [...files]
      .filter((file) => !query || file.filename.toLowerCase().includes(query))
      .sort((a, b) => {
        if (fileSort === "largest") return b.size - a.size;
        if (fileSort === "name") return a.filename.localeCompare(b.filename);
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      });
  }, [fileSearch, fileSort, files]);

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
    <div className="dashboard-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <nav className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Dashboard sections">
            {([
              ["files", "Files"],
              ["shared", "Shared links"],
              ["activity", "Activity"],
              ["security", "Security"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                  activeTab === tab
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
                }`}
                aria-current={activeTab === tab ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>

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
            <button
              type="button"
              onClick={() => void loadFiles(true)}
              className="icon-button h-10 w-10 rounded-xl"
              aria-label="Refresh files"
              title="Refresh files"
            >
              <RefreshCw className={`h-4 w-4 ${loadingFiles ? "animate-spin" : ""}`} />
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-4 py-7 sm:px-6 lg:py-10">
        <section className="subtle-enter mb-6 text-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="h-2 w-2 rounded-full bg-success" />
              Workspace protected
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Your secure workspace</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Keep sensitive files encrypted in your browser and ready to share on your terms.
            </p>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap justify-center gap-2">
          {[
            ["Files", files.length.toString(), Files],
            ["Encrypted storage", formatFileSize(totalStorage), HardDrive],
            ["Downloads", totalDownloads.toString(), Activity],
          ].map(([label, value, Icon]) => (
            <div key={label as string} className="pill gap-2 px-3 py-2">
              <Icon className="h-3.5 w-3.5" />
              <span>{label as string}</span>
              <strong className="text-foreground">{value as string}</strong>
            </div>
          ))}
        </section>

        {banner && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-success/40 bg-success/15 text-success-foreground"
                : banner.type === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
                : "border-primary/35 bg-primary/10 text-info-foreground"
            }`}
            role="status"
          >
            {banner.message}
          </div>
        )}

        {activeTab === "files" ? (
          <section className="space-y-6">
            <div className="surface-card subtle-enter rounded-3xl p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Private transfer</p>
                  <h2 className="mt-1 text-xl font-bold text-foreground">Upload & encrypt</h2>
                </div>
                <span className="pill">AES-256</span>
              </div>
              <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr] md:items-center">
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
                  className={`flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/10"
                      : selectedFileName
                      ? "border-success/45 bg-success/10"
                      : "border-border bg-secondary/25"
                  }`}
                  aria-label="Select file to upload"
                >
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                    selectedFile ? "bg-success/20" : "bg-primary/15"
                  }`}>
                    {selectedFile ? <FileText className="h-5 w-5 text-success" /> : <UploadCloud className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="max-w-full truncate text-sm font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : "Drop a file here or browse"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedFile ? formatFileSize(selectedFile.size) : "Any file type, up to 100 MB"}
                  </p>
                </div>

                <div>
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
                      {showEncPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {selectedFile && (
                    <button type="button" onClick={() => setSelectedFile(null)} className="btn-secondary mt-3 px-3 py-1.5 text-sm">
                      Remove file
                    </button>
                  )}
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
                        <Lock className="h-4 w-4" />
                        Encrypt & Upload
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Your password stays in this browser and is never sent to the server.
                  </p>
                </div>
              </div>
            </div>

          <section className="surface-card subtle-enter rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">File library</p>
                  <h2 className="mt-1 text-xl font-bold text-foreground">Your encrypted files</h2>
                </div>
                <span className="pill">{visibleFiles.length} of {files.length} items</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={fileSearch}
                    onChange={(event) => setFileSearch(event.target.value)}
                    className="input-base pl-9"
                    placeholder="Search files"
                    aria-label="Search files"
                  />
                </label>
                <label className="relative sm:w-44">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={fileSort}
                    onChange={(event) => setFileSort(event.target.value as typeof fileSort)}
                    className="input-base appearance-none pl-9"
                    aria-label="Sort files"
                  >
                    <option value="newest">Newest first</option>
                    <option value="largest">Largest first</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </label>
              </div>
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
            ) : visibleFiles.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-5 py-12 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">No matching files</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different filename or clear the search.
                </p>
                <button
                  type="button"
                  onClick={() => setFileSearch("")}
                  className="btn-secondary mt-4 px-3 py-2 text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFiles.map((file) => (
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
        ) : activeTab === "shared" ? (
          <section className="surface-card subtle-enter rounded-3xl p-6 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">Shared links</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Active share links will appear here when the current API provides them.
            </p>
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
              No shared links are available in the file list yet.
            </div>
          </section>
        ) : activeTab === "activity" ? (
          <section className="surface-card subtle-enter rounded-3xl p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent activity</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Workspace timeline</h2>
            </div>
            {files.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/25 px-5 py-12 text-center">
                <History className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">No activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Uploads and downloads will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFiles.map((file) => (
                  <div key={file.id} className="file-row-surface flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{file.filename}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="pill shrink-0">{file.downloadsCount} downloads</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="surface-card subtle-enter rounded-3xl p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Protection overview</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">Security controls</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Browser-side AES-256", "Files are encrypted before upload."],
                ["TOTP 2FA", "No TOTP status is exposed by the current auth context."],
                ["Self-destructing links", "Share links can expire and limit attempts."],
              ].map(([title, description]) => (
                <div key={title} className="surface-muted rounded-2xl p-4">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
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
                <div className="rounded-xl border border-success/40 bg-success/15 p-3 text-sm text-success-foreground">
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