export type UserRole = 'admin' | 'marketing' | 'comercial' | 'financeiro' | 'professor';

export const USER_ROLES = {
  ADMIN: 'admin' as const,
  MARKETING: 'marketing' as const,
  COMERCIAL: 'comercial' as const,
  FINANCEIRO: 'financeiro' as const,
  PROFESSOR: 'professor' as const,
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  professor: 'Professor',
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value: value as UserRole,
  label,
}));
