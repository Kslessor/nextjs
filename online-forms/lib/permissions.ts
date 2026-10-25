import type { Form, Role, User } from './types'

/** Role matrix from spec §1.2.1. */
const MATRIX: Record<Role, Set<string>> = {
  admin: new Set(['create', 'publish', 'editStructure', 'delete', 'managePermissions', 'viewAll', 'export', 'audit', 'editOthers']),
  content: new Set(['create', 'publish', 'editStructure', 'viewAll', 'export']),
  staff: new Set(['create', 'publish', 'managePermissions', 'viewAll', 'export']),
}

export type Permission = 'create' | 'publish' | 'editStructure' | 'delete' | 'managePermissions' | 'viewAll' | 'export' | 'audit' | 'editOthers'

export const can = (u: User, p: Permission) => MATRIX[u.role].has(p)

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Q-Flow Admin',
  content: 'Content Manager',
  staff: 'Staff Manager',
}

/** Why the builder is read-only for this user, or null if they may edit. */
export function editBlocker(u: User, form: Form): string | null {
  if (form.status !== 'draft') return null // status banner covers it
  if (!can(u, 'editStructure')) return `${ROLE_LABEL[u.role]}s can create and publish forms but can’t edit form structure.`
  if (form.createdBy !== u.email && !can(u, 'editOthers')) return `Only a Q-Flow Admin can edit forms created by others.`
  return null
}
