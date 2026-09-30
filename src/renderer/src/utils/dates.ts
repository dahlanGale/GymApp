import { Member } from '../types'

export type MemberStatus = Member['status']

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 1000 * 60 * 60 * 24

// Las fechas 'YYYY-MM-DD' se manejan como fechas locales; new Date('YYYY-MM-DD') las interpreta en UTC
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidDateString(value: string | undefined | null): value is string {
  return !!value && DATE_STRING_PATTERN.test(value.slice(0, 10))
}

function parseDateParts(value: string): [number, number, number] {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return [year, month, day]
}

export function addDaysToDateString(value: string, days: number): string {
  const [year, month, day] = parseDateParts(value)
  return toLocalDateString(new Date(year, month - 1, day + days))
}

export function daysUntil(value: string, today: string = toLocalDateString()): number {
  const [year, month, day] = parseDateParts(value)
  const [todayYear, todayMonth, todayDay] = parseDateParts(today)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / MS_PER_DAY)
}

export function isDateStringExpired(value: string, today: string = toLocalDateString()): boolean {
  if (!isValidDateString(value)) return true
  return value.slice(0, 10) < today
}

// Mismo criterio que el check-in del proceso main: congelado > expirado (estado o fecha) > activo
export function getMemberStatus(member: Member, today: string = toLocalDateString()): MemberStatus {
  if (member.status === 'frozen') return 'frozen'
  if (member.status === 'expired' || isDateStringExpired(member.endDate, today)) return 'expired'
  return 'active'
}
