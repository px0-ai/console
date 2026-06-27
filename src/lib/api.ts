import type {
  User, Team, Prompt, PromptVersion, APIKey, APIKeyCreated,
  RenderResponse, TeamMember, Organization,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('px0-token')
    if (token) h['Authorization'] = `Bearer ${token}`
  }
  return h
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeaders(), ...init?.headers },
    ...init,
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    let msg = String(res.status)
    try {
      const body = await res.json()
      msg = body.error ?? msg
    } catch {
      msg = (await res.text()) || msg
    }
    throw new ApiError(res.status, msg)
  }

  return res.json() as Promise<T>
}

function get<T>(path: string) {
  return apiFetch<T>(path, { method: 'GET' })
}

function post<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function put<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

function del<T>(path: string) {
  return apiFetch<T>(path, { method: 'DELETE' })
}

export const api = {
  auth: {
    register: (email: string, password: string, team_id?: string) =>
      post<{ user: User }>('/v1/auth/register', { email, password, ...(team_id ? { team_id } : {}) }),
    login: (email: string, password: string) =>
      post<{ token: string; expires_at: string; user: User }>('/v1/auth/login', { email, password }),
    logout: () => del<void>('/v1/auth/session'),
    me: () => get<{ user: User }>('/v1/auth/me'),
    verifyEmail: (email: string, code: string) =>
      post<{ message: string }>('/v1/auth/verify-email', { email, code }),
    triggerVerification: (email: string) =>
      get<{ message: string }>(`/v1/auth/verify-email?email=${encodeURIComponent(email)}`),
    triggerPasswordReset: (email: string) =>
      post<{ message: string }>('/v1/auth/password-reset/trigger', { email }),
    resetPassword: (code: string, new_password: string) =>
      post<{ message: string; email: string }>('/v1/auth/password-reset/reset', { code, new_password }),
  },

  teams: {
    listMine: () => get<{ teams: Team[] }>('/v1/me/teams'),
    create: (orgID: string, name: string) =>
      post<{ team: Team }>(`/v1/orgs/${orgID}/teams`, { name }),
    update: (id: string, name: string) =>
      put<{ team: Team }>(`/v1/teams/${id}`, { name }),
    listMembers: (id: string, page = 1) =>
      get<{ members: TeamMember[]; page: number; limit: number; total: number }>(
        `/v1/teams/${id}/members?page=${page}`,
      ),
    addMember: (id: string, user_id: string) =>
      post<void>(`/v1/teams/${id}/members`, { user_id }),
    removeMember: (id: string, userID: string) =>
      del<void>(`/v1/teams/${id}/members/${userID}`),
    updateMemberRole: (id: string, userID: string, role: TeamMember['role']) =>
      put<{ message: string }>(`/v1/teams/${id}/members/${userID}/role`, { role }),
  },

  orgs: {
    create: (name: string) =>
      post<{ org: Organization }>('/v1/orgs', { name }),
    update: (id: string, name: string) =>
      put<{ org: Organization }>(`/v1/orgs/${id}`, { name }),
  },

  prompts: {
    list: (teamID: string) =>
      get<{ prompts: Prompt[] }>(`/v1/teams/${teamID}/prompts`),
    create: (teamID: string, name: string, description?: string) =>
      post<{ prompt: Prompt }>(`/v1/teams/${teamID}/prompts`, { name, description }),
    get: (id: string) =>
      get<{ prompt: Prompt }>(`/v1/prompts/${id}`),
    delete: (id: string) =>
      del<void>(`/v1/prompts/${id}`),
    render: (id: string, variables: Record<string, unknown>) =>
      post<RenderResponse>(`/v1/prompts/${id}/render`, { variables }),
  },

  versions: {
    list: (promptID: string) =>
      get<{ versions: PromptVersion[] }>(`/v1/prompts/${promptID}/versions`),
    get: (promptID: string, version: number) =>
      get<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}`),
    create: (promptID: string, template: string) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions`, { template }),
    update: (promptID: string, version: number, template: string) =>
      put<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}`, { template }),
    publish: (promptID: string, version: number) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/publish`),
    render: (promptID: string, version: number, variables: Record<string, unknown>) =>
      post<RenderResponse>(`/v1/prompts/${promptID}/versions/${version}/render`, { variables }),
  },

  apiKeys: {
    list: (orgID: string) =>
      get<{ api_keys: APIKey[] }>(`/v1/api-keys?org_id=${orgID}`),
    create: (name: string, org_id: string, operation: 'read_render' | 'all', team_ids?: string[]) =>
      post<APIKeyCreated>('/v1/api-keys', { name, org_id, operation, ...(team_ids ? { team_ids } : {}) }),
    delete: (id: string) =>
      del<void>(`/v1/api-keys/${id}`),
  },
}
