const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  token: string | null,
  init?: RequestInit
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
