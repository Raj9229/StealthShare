const API_BASE = "/api";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  auth: {
    register: (data: { username: string; email: string; password: string }) =>
      request<{ id: number; username: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { username: string; password: string }) =>
      request<{ id: number; username: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
    me: () =>
      request<{ id: number; username: string }>("/auth/me"),
  },

  files: {
    upload: async (formData: FormData) => {
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
        // Don't set Content-Type — browser sets it with boundary for FormData
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<{
        id: number;
        filename: string;
        size: number;
        uploadDate: string;
      }>;
    },
    list: () =>
      request<
        Array<{
          id: number;
          filename: string;
          size: number;
          uploadDate: string;
          downloadsCount: number;
        }>
      >("/files"),
    delete: (id: number) =>
      request<{ message: string }>(`/files/${id}`, { method: "DELETE" }),
  },

  tokens: {
    create: (data: { fileId: number; expiryHours: number; maxAttempts: number }) =>
      request<{
        id: number;
        token: string;
        expiryTime: string;
        maxAttempts: number;
      }>("/tokens", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getInfo: (token: string) =>
      request<{
        filename: string;
        size: number;
        iv: string;
        salt: string;
        attemptsRemaining: number;
        expiryTime: string;
      }>(`/tokens/${token}`),
    download: async (token: string): Promise<ArrayBuffer> => {
      const res = await fetch(`${API_BASE}/tokens/${token}/download`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.arrayBuffer();
    },
  },
};
