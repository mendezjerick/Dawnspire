export type Role = 'admin' | 'hr' | 'member';
export type User = { id: number; username: string; displayName: string; role: Role; mustChangePassword: boolean };

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public retryAfterMs?: number) { super(message); }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError("Can't reach Base. Check your connection and try again.", 0);
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(data?.error ?? 'Something went wrong. Try again.', res.status, data?.code, data?.retryAfterMs);
  return data as T;
}
