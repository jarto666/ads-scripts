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
    fetchApi<{ user: { id: string; email: string; createdAt: string } }>(
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
    fetchApi<{ id: string; email: string; createdAt: string }>('/auth/me'),
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
      platforms: string[];
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
    platforms: string[];
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
      platforms: string[];
      language?: string;
      region?: string;
    }>,
  ) =>
    fetchApi<{ id: string }>(`/projects/${id}`, {
      method: 'PUT',
      json: data,
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

export { ApiError };
