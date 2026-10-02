// Formatos de presentación compartidos por todas las pantallas
export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
