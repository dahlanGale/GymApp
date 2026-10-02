import type { Member, Membership } from '../shared/types'
import { isRealDate, normalizeDateString } from '../shared/dates'
import { normalizeText } from '../shared/text'

export type CsvDelimiter = ',' | ';'

export interface ParsedCsv {
  delimiter: CsvDelimiter
  rows: string[][]
  // true si el archivo termina con un campo entre comillas sin cerrar
  unclosedQuote: boolean
}

function detectCsvDelimiter(text: string): CsvDelimiter {
  // Excel en español suele exportar con punto y coma
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

// RFC 4180: un campo que EMPIEZA con comillas puede contener delimitadores, saltos de línea y comillas escapadas ("").
// Una comilla en medio de un campo sin comillas (p. ej. Mancuerna 10") se toma como texto normal.
export function parseCsv(text: string): ParsedCsv {
  const input = text.replace(/^\uFEFF/, '')
  const delimiter = detectCsvDelimiter(input)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field.trim() === '') {
      field = ''
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return {
    delimiter,
    rows: rows.filter(values => values.some(value => value.trim() !== '')),
    unclosedQuote: inQuotes
  }
}

function normalizeKey(value: string): string {
  return normalizeText(value).replace(/[\s_\-.]/g, '')
}

// Encabezados aceptados (en inglés y español) para cada campo
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'nombre', 'nombrecompleto'],
  code: ['code', 'codigo', 'codigomiembro'],
  phone: ['phone', 'telefono', 'tel', 'celular'],
  email: ['email', 'correo', 'correoelectronico', 'mail'],
  membershipid: ['membershipid', 'membership', 'membresia', 'membresiaid', 'idmembresia'],
  startdate: ['startdate', 'fechainicio', 'inicio'],
  enddate: ['enddate', 'fechafin', 'vencimiento', 'fechavencimiento', 'expira'],
  status: ['status', 'estado'],
  category: ['category', 'categoria'],
  price: ['price', 'precio'],
  stock: ['stock', 'existencia', 'existencias', 'inventario'],
  durationdays: ['durationdays', 'duration', 'duracion', 'duraciondias', 'dias'],
  haspromotion: ['haspromotion', 'promocion', 'tienepromocion'],
  promotiontype: ['promotiontype', 'tipopromocion'],
  promotiondiscount: ['promotiondiscount', 'descuento', 'descuentopromocion'],
  includesannualmaintenance: ['includesannualmaintenance', 'incluyemantenimiento', 'mantenimientoanual']
}

const HEADER_LOOKUP = new Map<string, string>(
  Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) => aliases.map(alias => [alias, field] as const))
)

export function normalizeHeader(header: string): string {
  const key = normalizeKey(header)
  return HEADER_LOOKUP.get(key) ?? key
}

// Interpreta números con formato inglés (1,300.50) o español (1.300,50) según los separadores presentes
export function parseCsvNumber(value: string | undefined, delimiter: CsvDelimiter): number | null {
  let text = (value ?? '').replace(/[\s$]/g, '')
  if (text === '') return null

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    // El separador que aparece al final es el decimal
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (lastComma !== -1) {
    const isThousands = delimiter === ',' && /^-?\d{1,3}(,\d{3})+$/.test(text)
    text = isThousands ? text.replace(/,/g, '') : text.replace(',', '.')
  } else if (lastDot !== -1) {
    const isThousands = delimiter === ';' && /^-?\d{1,3}(\.\d{3})+$/.test(text)
    if (isThousands) text = text.replace(/\./g, '')
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  return Number(text)
}

const DAY_FIRST_DATE_PATTERN = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/

// Acepta YYYY-MM-DD (con o sin hora) y DD/MM/AAAA (formato de Excel en es-MX). Devuelve null si no es válida
export function parseCsvDate(value: string | undefined): string | null {
  const text = (value ?? '').trim()
  if (text === '') return null

  const isoDate = normalizeDateString(text)
  if (isoDate) return isoDate

  const match = DAY_FIRST_DATE_PATTERN.exec(text)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (!isRealDate(year, month, day)) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const TRUE_VALUES = new Set(['true', '1', 'si', 'yes', 'verdadero', 'x'])

export function parseCsvBoolean(value: string | undefined): boolean {
  return TRUE_VALUES.has(normalizeKey(value ?? ''))
}

const MEMBER_STATUS_ALIASES: Record<string, Member['status']> = {
  active: 'active',
  activo: 'active',
  activa: 'active',
  vigente: 'active',
  expired: 'expired',
  expirado: 'expired',
  expirada: 'expired',
  vencido: 'expired',
  vencida: 'expired',
  inactivo: 'expired',
  inactiva: 'expired',
  frozen: 'frozen',
  congelado: 'frozen',
  congelada: 'frozen',
  suspendido: 'frozen',
  suspendida: 'frozen',
  pausado: 'frozen',
  pausada: 'frozen'
}

// undefined = vacío (se decide por la fecha); null = valor no reconocido
export function parseCsvMemberStatus(value: string | undefined): Member['status'] | null | undefined {
  const key = normalizeKey(value ?? '')
  if (key === '') return undefined
  return MEMBER_STATUS_ALIASES[key] ?? null
}

const PROMOTION_TYPES: NonNullable<Membership['promotionType']>[] = ['new_client', 'couple', 'no_maintenance']

export function parseCsvPromotionType(value: string | undefined): Membership['promotionType'] {
  const normalized = (value ?? '').trim().toLowerCase()
  return PROMOTION_TYPES.find(type => type === normalized) ?? null
}

export function sameText(a: string, b: string): boolean {
  return normalizeKey(a) === normalizeKey(b)
}
