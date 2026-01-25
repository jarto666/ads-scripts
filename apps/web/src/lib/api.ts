const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { json, ...fetchOptions } = options;

  const headers: Record<string, string> = {};

  if (fetchOptions.headers) {
    const existingHeaders = fetchOptions.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies for auth
    body: json ? JSON.stringify(json) : fetchOptions.body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, data);
  }

  return response.json();
}

// Auth API
export const auth = {
  requestLink: (email: string) =>
    fetchApi<{ message: string }>('/auth/request-link', {
      method: 'POST',
      json: { email },
    }),

  consumeLink: (token: string) =>
    fetchApi<{ user: { id: string; email: string; isAdmin: boolean; plan: 'free' | 'pro'; createdAt: string } }>(
      '/auth/consume-link',
      {
        method: 'POST',
        json: { token },
      },
    ),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    fetchApi<{ id: string; email: string; isAdmin: boolean; plan: 'free' | 'pro'; createdAt: string }>('/auth/me'),
};

// Admin API
export interface AccessRequest {
  id: string;
  email: string;
  status: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  plan: 'free' | 'pro';
  createdAt: string;
  _count: {
    projects: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalRequests: number;
  pendingRequests: number;
  totalProjects: number;
  totalScripts: number;
}

export const admin = {
  getStats: () => fetchApi<AdminStats>('/admin/stats'),

  getRequests: (status?: string) =>
    fetchApi<AccessRequest[]>(`/admin/requests${status ? `?status=${status}` : ''}`),

  approveRequest: (id: string) =>
    fetchApi<{ user: AdminUser; created: boolean }>(`/admin/requests/${id}/approve`, {
      method: 'POST',
    }),

  rejectRequest: (id: string) =>
    fetchApi<AccessRequest>(`/admin/requests/${id}/reject`, {
      method: 'POST',
    }),

  deleteRequest: (id: string) =>
    fetchApi<AccessRequest>(`/admin/requests/${id}`, {
      method: 'DELETE',
    }),

  getUsers: () => fetchApi<AdminUser[]>('/admin/users'),

  createUser: (email: string, isAdmin = false) =>
    fetchApi<AdminUser>('/admin/users', {
      method: 'POST',
      json: { email, isAdmin },
    }),

  deleteUser: (id: string) =>
    fetchApi<AdminUser>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  toggleAdmin: (id: string) =>
    fetchApi<AdminUser>(`/admin/users/${id}/toggle-admin`, {
      method: 'POST',
    }),

  generateMagicLink: (id: string) =>
    fetchApi<{ magicLink: string }>(`/admin/users/${id}/magic-link`, {
      method: 'POST',
    }),

  updateUserPlan: (id: string, plan: 'free' | 'pro') =>
    fetchApi<AdminUser>(`/admin/users/${id}/plan`, {
      method: 'PATCH',
      json: { plan },
    }),
};

// Projects API
export const projects = {
  list: () =>
    fetchApi<
      Array<{
        id: string;
        name: string;
        productDescription: string;
        createdAt: string;
        updatedAt: string;
      }>
    >('/projects'),

  get: (id: string) =>
    fetchApi<{
      id: string;
      name: string;
      productDescription: string;
      offer?: string;
      brandVoice?: string;
      forbiddenClaims: string[];
      language: string;
      region?: string;
      createdAt: string;
      updatedAt: string;
      personas: Persona[];
    }>(`/projects/${id}`),

  create: (data: {
    name: string;
    productDescription: string;
    offer?: string;
    brandVoice?: string;
    forbiddenClaims?: string[];
    language?: string;
    region?: string;
  }) =>
    fetchApi<{ id: string }>('/projects', {
      method: 'POST',
      json: data,
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      productDescription: string;
      offer?: string;
      brandVoice?: string;
      forbiddenClaims?: string[];
      language?: string;
      region?: string;
    }>,
  ) =>
    fetchApi<{ id: string }>(`/projects/${id}`, {
      method: 'PUT',
      json: data,
    }),

  delete: (id: string) =>
    fetchApi<{ id: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

// Persona type
export interface Persona {
  id: string;
  name: string;
  description: string;
  demographics?: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  createdAt: string;
  updatedAt: string;
}

// Personas API
export const personas = {
  listByProject: (projectId: string) =>
    fetchApi<Persona[]>(`/projects/${projectId}/personas`),

  get: (id: string) => fetchApi<Persona>(`/personas/${id}`),

  create: (
    projectId: string,
    data: {
      name: string;
      description: string;
      demographics?: string;
      painPoints?: string[];
      desires?: string[];
      objections?: string[];
    },
  ) =>
    fetchApi<Persona>(`/projects/${projectId}/personas`, {
      method: 'POST',
      json: data,
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      demographics?: string;
      painPoints?: string[];
      desires?: string[];
      objections?: string[];
    }>,
  ) =>
    fetchApi<Persona>(`/personas/${id}`, {
      method: 'PUT',
      json: data,
    }),

  delete: (id: string) =>
    fetchApi<Persona>(`/personas/${id}`, {
      method: 'DELETE',
    }),
};

// Batch types
export interface Batch {
  id: string;
  status: string;
  requestedCount: number;
  platform: string;
  angles: string[];
  durations: number[];
  personaIds: string[];
  quality: 'standard' | 'premium';
  pdfUrl?: string;
  csvUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  scriptsCount?: number;
  completedCount?: number;
  progress?: number;
  _count?: {
    scripts: number;
  };
}

export interface StoryboardStep {
  t: string;
  shot: string;
  onScreen: string;
  spoken: string;
  broll?: string[];
}

export interface Script {
  id: string;
  status: string;
  angle: string;
  duration: number;
  hook?: string;
  storyboard?: StoryboardStep[];
  ctaVariants: string[];
  filmingChecklist: string[];
  warnings: string[];
  score?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Batches API
export const batches = {
  create: (
    projectId: string,
    data: {
      requestedCount: number;
      platform: string;
      angles: string[];
      durations: number[];
      personaIds?: string[];
      quality?: 'standard' | 'premium';
    },
  ) =>
    fetchApi<Batch>(`/projects/${projectId}/batches`, {
      method: 'POST',
      json: data,
    }),

  listByProject: (projectId: string) =>
    fetchApi<Batch[]>(`/projects/${projectId}/batches`),

  get: (id: string) => fetchApi<Batch>(`/batches/${id}`),

  getScripts: (id: string) => fetchApi<Script[]>(`/batches/${id}/scripts`),

  export: (id: string) =>
    fetchApi<{ pdfUrl: string; csvUrl: string }>(`/batches/${id}/export`, {
      method: 'POST',
    }),
};

// Scripts API
export const scripts = {
  regenerate: (id: string, instruction: string) =>
    fetchApi<Script>(`/scripts/${id}/regenerate`, {
      method: 'POST',
      json: { instruction },
    }),
};

// Settings types
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro';
  createdAt: string;
}

// Settings API
export const settings = {
  getProfile: () => fetchApi<UserProfile>('/settings/profile'),

  updateProfile: (data: { name?: string }) =>
    fetchApi<UserProfile>('/settings/profile', {
      method: 'PATCH',
      json: data,
    }),

  deleteAccount: () =>
    fetchApi<{ success: boolean }>('/settings/account', {
      method: 'DELETE',
    }),
};

export { ApiError };
