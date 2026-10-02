import type { Member } from './types'

// Utilidades de fecha compartidas por main y renderer, para que ambos decidan igual si un miembro está vigente.
// Las fechas 'YYYY-MM-DD' se tratan como fechas locales; new Date('YYYY-MM-DD') las interpretaría en UTC.

export type MemberStatus = Member['status']

const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/
const MS_PER_DAY = 1000 * 60 * 60 * 24

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

// Devuelve 'YYYY-MM-DD' si el valor empieza con una fecha real en ese formato (acepta hora después), o null
export function normalizeDateString(value: string | undefined | null): string | null {
  if (!value) return null
  const match = DATE_PREFIX_PATTERN.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match
  if (!isRealDate(Number(year), Number(month), Number(day))) return null
  return `${year}-${month}-${day}`
}

export function isValidDateString(value: string | undefined | null): value is string {
  return normalizeDateString(value) !== null
}

function toUtcDay(value: string): number {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function addDaysToDateString(value: string, days: number): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return toLocalDateString(new Date(year, month - 1, day + days))
}

export function daysBetweenDateStrings(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY)
}

export function daysUntil(value: string, today: string = toLocalDateString()): number {
  return daysBetweenDateStrings(today, value)
}

// Sin fecha válida cuenta como expirada; el día de vencimiento todavía es válido
export function isDateStringExpired(value: string | undefined | null, today: string = toLocalDateString()): boolean {
  const date = normalizeDateString(value)
  return date === null || date < today
}

export function isMembershipExpired(
  member: Pick<Member, 'status' | 'endDate'>,
  today: string = toLocalDateString()
): boolean {
  return member.status === 'expired' || isDateStringExpired(member.endDate, today)
}

// Congelado > expirado (por estado o fecha) > activo
export function getMemberStatus(
  member: Pick<Member, 'status' | 'endDate'>,
  today: string = toLocalDateString()
): MemberStatus {
  if (member.status === 'frozen') return 'frozen'
  if (isMembershipExpired(member, today)) return 'expired'
  return 'active'
}
