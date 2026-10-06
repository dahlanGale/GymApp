import { app, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import log from 'electron-log/main'
import type { SecurityResult, SecurityStatus } from '../shared/types'

// Contraseña de la ventana principal. Solo se guarda un hash scrypt con sal aleatoria, en un archivo
// aparte de los datos (no viaja en los respaldos exportados), así que no se puede leer ni recuperar.
// Si se olvida, se quita borrando gym-pos-security.json de la carpeta de datos.

interface StoredPassword {
  algorithm: 'scrypt'
  salt: string
  hash: string
  N: number
  r: number
  p: number
  keyLength: number
}

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64
const MIN_PASSWORD_LENGTH = 4
// Pausa tras un intento fallido, para que probar contraseñas a mano sea lento
const FAILED_ATTEMPT_DELAY_MS = 800

let stored: StoredPassword | null = null
let locked = false

function getSecurityPath(): string {
  return join(app.getPath('userData'), 'gym-pos-security.json')
}

function isStoredPassword(value: unknown): value is StoredPassword {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return candidate.algorithm === 'scrypt' &&
    typeof candidate.salt === 'string' &&
    typeof candidate.hash === 'string' &&
    typeof candidate.N === 'number' &&
    typeof candidate.r === 'number' &&
    typeof candidate.p === 'number' &&
    typeof candidate.keyLength === 'number'
}

function hashPassword(password: string, salt: Buffer, params: Pick<StoredPassword, 'N' | 'r' | 'p' | 'keyLength'>): Buffer {
  return scryptSync(password.normalize('NFC'), salt, params.keyLength, { N: params.N, r: params.r, p: params.p })
}

function verifyPassword(password: string): boolean {
  if (!stored) return true
  try {
    const expected = Buffer.from(stored.hash, 'base64')
    const actual = hashPassword(password, Buffer.from(stored.salt, 'base64'), stored)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch (error) {
    log.error('Error verifying password:', error)
    return false
  }
}

function writeStoredPassword(next: StoredPassword | null): void {
  const filePath = getSecurityPath()
  if (!next) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return
  }
  const tmpPath = `${filePath}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), { encoding: 'utf-8', mode: 0o600 })
  fs.renameSync(tmpPath, filePath)
}

export function loadSecurity(): void {
  const filePath = getSecurityPath()
  try {
    if (fs.existsSync(filePath)) {
      const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      stored = isStoredPassword(parsed) ? parsed : null
      if (!stored) log.warn('Security file is not valid; ignoring it')
    }
  } catch (error) {
    log.error('Error reading security file:', error)
    stored = null
  }
  // Con contraseña, la ventana principal siempre arranca bloqueada
  locked = stored !== null
}

export function isLocked(): boolean {
  return locked
}

function getStatus(): SecurityStatus {
  return { hasPassword: stored !== null, locked }
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export function registerSecurityHandlers(): void {
  ipcMain.handle('security-status', (): SecurityStatus => getStatus())

  ipcMain.handle('security-unlock', async (_event, password: string): Promise<boolean> => {
    if (!stored) {
      locked = false
      return true
    }
    if (typeof password === 'string' && verifyPassword(password)) {
      locked = false
      return true
    }
    await wait(FAILED_ATTEMPT_DELAY_MS)
    return false
  })

  ipcMain.handle('security-lock', (): SecurityStatus => {
    if (stored) locked = true
    return getStatus()
  })

  // Crear o cambiar la contraseña; si ya hay una, hay que escribir la actual
  ipcMain.handle('security-set-password', async (_event, current: string, next: string): Promise<SecurityResult> => {
    if (locked) return { ok: false, error: 'La aplicación está bloqueada.' }
    if (stored && !verifyPassword(current)) {
      await wait(FAILED_ATTEMPT_DELAY_MS)
      return { ok: false, error: 'La contraseña actual no es correcta.' }
    }
    if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, error: `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` }
    }
    const salt = randomBytes(16)
    const params = { ...SCRYPT_PARAMS, keyLength: KEY_LENGTH }
    const nextStored: StoredPassword = {
      algorithm: 'scrypt',
      salt: salt.toString('base64'),
      hash: hashPassword(next, salt, params).toString('base64'),
      ...params
    }
    try {
      writeStoredPassword(nextStored)
      stored = nextStored
      return { ok: true }
    } catch (error) {
      log.error('Error saving password:', error)
      return { ok: false, error: 'No se pudo guardar la contraseña.' }
    }
  })

  ipcMain.handle('security-remove-password', async (_event, current: string): Promise<SecurityResult> => {
    if (locked) return { ok: false, error: 'La aplicación está bloqueada.' }
    if (!stored) return { ok: true }
    if (!verifyPassword(current)) {
      await wait(FAILED_ATTEMPT_DELAY_MS)
      return { ok: false, error: 'La contraseña actual no es correcta.' }
    }
    try {
      writeStoredPassword(null)
      stored = null
      return { ok: true }
    } catch (error) {
      log.error('Error removing password:', error)
      return { ok: false, error: 'No se pudo quitar la contraseña.' }
    }
  })
}
