import { MemberStatus } from './dates'

interface MemberStatusDisplay {
  // Etiqueta del miembro ("Activo") y de su membresía ("activa"), para concordar el género
  label: string
  membershipLabel: string
  variant: 'success' | 'danger' | 'warning'
}

export const MEMBER_STATUS_DISPLAY: Record<MemberStatus, MemberStatusDisplay> = {
  active: { label: 'Activo', membershipLabel: 'activa', variant: 'success' },
  expired: { label: 'Expirado', membershipLabel: 'expirada', variant: 'danger' },
  frozen: { label: 'Congelado', membershipLabel: 'congelada', variant: 'warning' },
}
