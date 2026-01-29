import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request interceptor: attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: 401 → refresh or redirect to sign-in; 403 → reject (caller shows message)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/v1/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/sign-in";
        }
      } else {
        if (!original.url?.includes("/auth/")) {
          window.location.href = "/sign-in";
        }
      }
    }
    return Promise.reject(err);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string; token_type: string }>(
      "/v1/auth/login",
      { email, password }
    ),
  signup: (email: string, password: string, full_name?: string) =>
    api.post<{ id: number; email: string; full_name: string | null }>(
      "/v1/auth/signup",
      { email, password, full_name }
    ),
  logout: () => {
    const refresh = localStorage.getItem("refresh_token");
    return api.post("/v1/auth/logout", { refresh_token: refresh || "" });
  },
  me: () => api.get<{ id: number; email: string; full_name: string | null; role: string }>("/v1/auth/me"),
  refresh: (refresh_token: string) =>
    api.post<{ access_token: string; refresh_token: string; token_type: string }>(
      "/v1/auth/refresh",
      { refresh_token }
    ),
};

// Files API
export interface FolderInfo {
  key: string;
  name: string;
}

export interface FileInfo {
  key: string;
  filename: string;
  size: number;
  file_type: string | null;
  last_modified: string;
  etag: string | null;
}

export interface FileTreeResponse {
  folders: FolderInfo[];
  files: FileInfo[];
  prefix: string | null;
}

export const filesApi = {
  listTree: (prefix = "", max_keys?: number) =>
    api.get<FileTreeResponse>("/v1/files/tree", {
      params: { prefix, ...(max_keys != null && { max_keys }) },
    }),
  downloadUrl: (key: string, expires_in = 3600) =>
    api.get<{ presigned_url: string; expires_in: number }>(
      `/v1/files/download/${key.split("/").map(encodeURIComponent).join("/")}`,
      { params: { expires_in } }
    ),
  upload: (file: File, path?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (path) {
      formData.append("path", path);
    }
    return api.post<FileInfo>("/v1/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  createFolder: (path: string) => {
    const formData = new FormData();
    formData.append("path", path);
    return api.post<{ key: string; message: string }>("/v1/files/create-folder", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Users & Admin API
export type UserRole = "admin" | "editor" | "viewer" | "external_viewer";

export interface UserResponse {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  allowed_path_prefix: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  full_name?: string | null;
  role: UserRole;
  is_active?: boolean;
  allowed_path_prefix?: string | null;
}

export interface UserUpdatePayload {
  email?: string;
  full_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
  password?: string | null;
  allowed_path_prefix?: string | null;
}

export interface AccessRule {
  id: string;
  label: string;
  description: string;
}

export interface PathPrefixOption {
  value: string;
  label: string;
}

export const usersApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<UserResponse[]>("/v1/users", { params: params ?? {} }),
  get: (id: number) => api.get<UserResponse>(`/v1/users/${id}`),
  create: (payload: UserCreatePayload) =>
    api.post<UserResponse>("/v1/users", payload),
  update: (id: number, payload: UserUpdatePayload) =>
    api.put<UserResponse>(`/v1/users/${id}`, payload),
  delete: (id: number) => api.delete(`/v1/users/${id}`),
  accessRules: () =>
    api.get<{ rules: AccessRule[] }>("/v1/users/access-rules"),
  pathPrefixes: () =>
    api.get<{ prefixes: PathPrefixOption[] }>("/v1/users/path-prefixes"),
  discoverPaths: (prefix = "") =>
    api.get<{ prefixes: PathPrefixOption[]; prefix?: string }>(
      "/v1/users/discover-paths",
      { params: { prefix } }
    ),
  stats: () =>
    api.get<{ total_users: number; active_users: number }>("/v1/users/stats"),
};

// Analytics API (activity trend)
export const analyticsApi = {
  getPrmData: () =>
    api.get<{ data: Record<string, unknown>[]; columns: string[] }>(
      "/v1/analytics/prm-data"
    ),
};
