import { CheckInResult } from '../types'

export type CheckInFeedbackType = 'success' | 'error' | 'warning'

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
