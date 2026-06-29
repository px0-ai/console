import type { VersionStatus } from '@/lib/types'

const MAP: Record<VersionStatus, string> = {
  draft:    'status-badge status-draft',
  stable:   'status-badge status-stable',
  live:     'status-badge status-live',
  archived: 'status-badge status-archived',
}

export function StatusBadge({ status }: { status: VersionStatus }) {
  return <span className={MAP[status]}>{status}</span>
}
