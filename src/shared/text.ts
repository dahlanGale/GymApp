// Normalización de texto compartida por main y renderer para búsquedas y comparaciones
// sin importar acentos, mayúsculas ni espacios al inicio o al final.
const COMBINING_MARKS = /[\u0300-\u036f]/g

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}
