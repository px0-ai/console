import type {
  User, Team, Prompt, PromptVersion, APIKey, APIKeyCreated,
  RenderResponse, TeamMember, Organization, OrganizationWithRole, TeamJoinRequest, PromptTag,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ErrorListener = (status: number, error: ApiError) => void
const listeners = new Set<ErrorListener>()

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
    const err = new ApiError(res.status, msg)
    listeners.forEach((listener) => {
      try {
        listener(res.status, err)
      } catch (e) {
        console.error('Error listener failed:', e)
      }
    })
    throw err
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
  addErrorListener: (cb: ErrorListener) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },

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
    listOrgTeams: (orgID: string) => get<{ teams: Team[] }>(`/v1/orgs/${orgID}/teams`),
    create: (orgID: string, name: string) =>
      post<{ team: Team }>(`/v1/orgs/${orgID}/teams`, { name }),
    update: (id: string, name: string) =>
      put<{ team: Team }>(`/v1/teams/${id}`, { name }),
    delete: (id: string) =>
      del<void>(`/v1/teams/${id}`),
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
    createJoinRequest: (id: string, body?: { justification?: string }) =>
      post<TeamJoinRequest>(`/v1/teams/${id}/join-requests`, body),
  },

  orgs: {
    listMine: () => get<{ organizations: OrganizationWithRole[] }>('/v1/me/orgs'),
    create: (name: string) =>
      post<{ org: Organization }>('/v1/orgs', { name }),
    update: (id: string, name: string) =>
      put<{ org: Organization }>(`/v1/orgs/${id}`, { name }),
    listPeople: (orgID: string, page = 1, limit = 10) =>
      get<{ people: User[]; page: number; limit: number; total: number }>(
        `/v1/orgs/${orgID}/people?page=${page}&limit=${limit}`,
      ),
    removeMember: (orgID: string, userID: string) =>
      del<void>(`/v1/orgs/${orgID}/members/${userID}`),
  },

  prompts: {
    list: (teamID: string, params?: { tag?: string; team_id?: string; archive?: boolean | string; status?: 'active' | 'archived'; all?: boolean }) => {
      const q = new URLSearchParams()
      if (params?.tag) q.set('tag', params.tag)
      if (params?.team_id) q.set('team_id', params.team_id)
      if (params?.archive !== undefined) q.set('archive', String(params.archive))
      if (params?.status !== undefined) q.set('status', params.status)
      if (params?.all !== undefined) q.set('all', String(params.all))
      const queryStr = q.toString()
      return get<{ prompts: Prompt[] }>(`/v1/teams/${teamID}/prompts${queryStr ? `?${queryStr}` : ''}`)
    },
    create: (teamID: string, name: string, description?: string) =>
      post<{ prompt: Prompt }>(`/v1/teams/${teamID}/prompts`, { name, description }),
    update: (id: string, name: string, description?: string, slug?: string) =>
      put<{ prompt: Prompt }>(`/v1/prompts/${id}`, { name, description, slug }),
    get: (id: string) =>
      get<{ prompt: Prompt }>(`/v1/prompts/${id}`),
    archive: (id: string) =>
      post<{ prompt: Prompt }>(`/v1/prompts/${id}/archive`),
    render: (id: string, variables: Record<string, unknown>) =>
      post<RenderResponse>(`/v1/prompts/${id}/render`, { variables }),
    listTags: (id: string) =>
      get<{ tags: PromptTag[] }>(`/v1/prompts/${id}/tags`),
  },

  versions: {
    list: (promptID: string, params?: { tags?: string; status?: string }) => {
      const q = new URLSearchParams()
      if (params?.tags) q.set('tags', params.tags)
      if (params?.status) q.set('status', params.status)
      const queryStr = q.toString()
      return get<{ versions: PromptVersion[] }>(`/v1/prompts/${promptID}/versions${queryStr ? `?${queryStr}` : ''}`)
    },
    get: (promptID: string, version: number) =>
      get<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}`),
    duplicate: (promptID: string, version: number | string) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/duplicate`),
    create: (promptID: string, template: string) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions`, { template }),
    update: (promptID: string, version: number, template: string) =>
      put<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}`, { template }),
    publish: (promptID: string, version: number) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/publish`),
    promote: (promptID: string, version: number) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/promote`),
    demote: (promptID: string, version: number) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/demote`),
    archive: (promptID: string, version: number) =>
      post<{ version: PromptVersion }>(`/v1/prompts/${promptID}/versions/${version}/archive`),
    delete: (promptID: string, version: number) =>
      del<void>(`/v1/prompts/${promptID}/versions/${version}`),
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
