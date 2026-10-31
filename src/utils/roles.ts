/**
 * Role naming differs between the database and the API surface: the `roles`
 * table uses `Agent`, while the legacy seed scripts create `SalesAgent`.
 * Both mean the same job, so the UI shows one Mongolian label for either.
 */

const ROLE_LABELS: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менежер',
  agent: 'Борлуулагч',
  salesagent: 'Борлуулагч',
  marketsalesperson: 'Агуулах борлуулагч',
  storesalesperson: 'Дэлгүүрийн борлуулагч',
};

/** Human-readable Mongolian label for a role name. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return '-';
  return ROLE_LABELS[role.trim().toLowerCase()] ?? role;
}
