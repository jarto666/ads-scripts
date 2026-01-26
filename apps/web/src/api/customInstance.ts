const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3232';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export const customInstance = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const fullUrl = `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
  });

  const headers = response.headers;

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return { data: {}, status: response.status, headers } as T;
  }

  const data = JSON.parse(text);
  return { data, status: response.status, headers } as T;
};

export default customInstance;
