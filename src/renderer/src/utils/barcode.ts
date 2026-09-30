// Code 39: cada carácter son 15 módulos (1 = barra, 0 = espacio); 3 de sus 9 elementos son anchos
const CODE39_PATTERNS: Record<string, string> = {
  '0': '101000111011101',
  '1': '111010001010111',
  '2': '101110001010111',
  '3': '111011100010101',
  '4': '101000111010111',
  '5': '111010001110101',
  '6': '101110001110101',
  '7': '101000101110111',
  '8': '111010001011101',
  '9': '101110001011101',
  'A': '111010100010111',
  'B': '101110100010111',
  'C': '111011101000101',
  'D': '101011100010111',
  'E': '111010111000101',
  'F': '101110111000101',
  'G': '101010001110111',
  'H': '111010100011101',
  'I': '101110100011101',
  'J': '101011100011101',
  'K': '111010101000111',
  'L': '101110101000111',
  'M': '111011101010001',
  'N': '101011101000111',
  'O': '111010111010001',
  'P': '101110111010001',
  'Q': '101010111000111',
  'R': '111010101110001',
  'S': '101110101110001',
  'T': '101011101110001',
  'U': '111000101010111',
  'V': '100011101010111',
  'W': '111000111010101',
  'X': '100010111010111',
  'Y': '111000101110101',
  'Z': '100011101110101',
  '-': '100010101110111',
  '*': '100010111011101'
}

const INTER_CHARACTER_GAP = '0'

export function isCode39Encodable(value: string): boolean {
  return value.length > 0 && value.toUpperCase().split('').every(char => char !== '*' && char in CODE39_PATTERNS)
}

// Devuelve la secuencia de módulos incluyendo los delimitadores de inicio y fin (*)
export function encodeCode39(value: string): string | null {
  if (!isCode39Encodable(value)) return null
  return `*${value.toUpperCase()}*`
    .split('')
    .map(char => CODE39_PATTERNS[char])
    .join(INTER_CHARACTER_GAP)
}
