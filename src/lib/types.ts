export interface User {
  id: string
  email: string
  is_verified: boolean
  is_admin: boolean
  created_at: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface OrganizationWithRole {
  id: string
  name: string
  role: 'admin' | 'member' | string
  created_at: string
}

export interface TeamJoinRequest {
  id: string
  team_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  org_id: string
  name: string
  created_at: string
}

export interface TeamMember {
  user_id: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

export interface Prompt {
  id: string
  slug?: string
  name: string
  description: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export type VersionStatus = 'draft' | 'stable' | 'live' | 'archived'

export interface PromptVersion {
  id: string
  prompt_id: string
  version: number
  template: string
  status: VersionStatus
  tags?: string[]
  created_at: string
  published_at: string | null
}

export interface APIKey {
  id: string
  name: string
  org_id: string
  team_id?: string | null
  key_prefix: string
  operation: 'read_render' | 'all'
  created_at: string
  last_used_at?: string | null
}

export interface APIKeyCreated {
  id: string
  name: string
  key: string
  key_prefix: string
  operation: 'read_render' | 'all'
  created_at: string
}

export interface RenderResponse {
  rendered: string
  version: number
}

export interface PromptTag {
  tag: string
  version: number
}
