import { CheckInResult } from '../types'

export type CheckInFeedbackType = 'success' | 'error' | 'warning'

export const CHECK_IN_FEEDBACK_COLORS: Record<CheckInFeedbackType, string> = {
  success: 'bg-green-100 border-green-500 text-green-800',
  warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  error: 'bg-red-100 border-red-500 text-red-800',
}

// Mensaje que se muestra tras un intento de check-in, igual en el kiosco y en Recepción
export function getFeedbackFromResult(result: CheckInResult): { type: CheckInFeedbackType; message: string } {
  switch (result.status) {
    case 'success':
      return { type: 'success', message: `¡Bienvenido ${result.memberName}!` }
    case 'duplicate':
      return { type: 'warning', message: `${result.memberName} - Entrada ya registrada` }
    case 'expired':
      return { type: 'warning', message: `${result.memberName} - Membresía Expirada` }
    case 'frozen':
      return { type: 'warning', message: `${result.memberName} - Membresía Congelada` }
    case 'ambiguous':
      return { type: 'error', message: 'Código compartido por varios miembros, usa tu código de miembro' }
    case 'not_found':
      return { type: 'error', message: 'Miembro no encontrado' }
  }
}
