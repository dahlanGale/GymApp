// Normalización de texto compartida por main y renderer para búsquedas y comparaciones
// sin importar acentos, mayúsculas ni espacios al inicio o al final.
const COMBINING_MARKS = /[\u0300-\u036f]/g

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}

// Los lectores NFC tipo teclado escriben el número de serie de la tarjeta en decimal o hexadecimal,
// a veces con espacios o ':' entre bytes; se guarda siempre en mayúsculas y sin separadores
export function normalizeNfcTag(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/[\s:\-]/g, '')
}
