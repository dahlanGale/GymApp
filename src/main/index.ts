import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import * as fs from 'fs'
import type {
  Member,
  Membership,
  Product,
  Sale,
  Entry,
  MembershipSale,
  Attendance,
  CheckInResult,
  AddSaleResult,
  ImportSummary,
  ReceptionMember,
  ReceptionState,
  SecondaryWindow,
  BusinessConfig,
  AppData
} from '../shared/types'
import {
  toLocalDateString,
  normalizeDateString,
  addDaysToDateString,
  daysBetweenDateStrings,
  isMembershipExpired,
  getMemberStatus
} from '../shared/dates'
import {
  parseCsv,
  normalizeHeader,
  parseCsvNumber,
  parseCsvDate,
  parseCsvBoolean,
  parseCsvMemberStatus,
  parseCsvPromotionType,
  sameText
} from './csv'

log.initialize()
log.info('Application starting...')

const DUPLICATE_CHECK_IN_WINDOW_MS = 2 * 60 * 1000

const defaultData: AppData = {
  members: [],
  memberships: [
    { id: '1', name: 'Mensual', price: 500, durationDays: 30, hasPromotion: false, promotionType: null, promotionDiscount: 0, includesAnnualMaintenance: false },
    { id: '2', name: 'Trimestral', price: 1300, durationDays: 90, hasPromotion: false, promotionType: null, promotionDiscount: 0, includesAnnualMaintenance: false },
    { id: '3', name: 'Anual', price: 4500, durationDays: 365, hasPromotion: false, promotionType: null, promotionDiscount: 0, includesAnnualMaintenance: false }
  ],
  products: [
    { id: '1', name: 'Proteína', category: 'Suplementos', price: 350, stock: 20 },
    { id: '2', name: 'Creatina', category: 'Suplementos', price: 250, stock: 30 },
    { id: '3', name: 'Pre-entreno', category: 'Suplementos', price: 300, stock: 15 }
  ],
  sales: [],
  entries: [],
  membershipSales: [],
  attendances: [],
  config: {
    gymName: 'Mi Gym',
    address: '',
    phone: '',
    email: '',
    annualMaintenanceCost: 0
  }
}

type CollectionKey = Exclude<keyof AppData, 'config'>

const COLLECTION_KEYS: CollectionKey[] = [
  'members',
  'memberships',
  'products',
  'sales',
  'entries',
  'membershipSales',
  'attendances'
]

const MEMBER_CODE_START = 1001
const MEMBER_CODE_PATTERN = /^[0-9A-Z-]{1,20}$/

function createDefaultData(): AppData {
  return structuredClone(defaultData)
}

let data: AppData = createDefaultData()
let dataPath: string
let loadWarning: string | null = null

function getDataPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'gym-pos-data.json')
}

function getBackupPath(): string {
  return `${dataPath}.bak`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Devuelve null si el archivo no se puede leer o no tiene la forma de AppData
function readDataFile(filePath: string): AppData | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!isRecord(parsed)) return null

    const result = createDefaultData()
    for (const key of COLLECTION_KEYS) {
      const value: unknown = parsed[key]
      if (value === undefined) continue
      if (!Array.isArray(value)) return null
      Object.assign(result, { [key]: value as unknown[] })
    }
    if (isRecord(parsed.config)) {
      result.config = { ...result.config, ...(parsed.config as Partial<BusinessConfig>) }
    }
    return result
  } catch (error) {
    log.error(`Error reading data file ${filePath}:`, error)
    return null
  }
}

// Mueve el archivo dañado a un lado para que ningún guardado posterior lo sobrescriba
function preserveCorruptFile(): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const corruptPath = dataPath.replace(/\.json$/, `.corrupt-${timestamp}.json`)
  try {
    fs.renameSync(dataPath, corruptPath)
    log.warn(`Corrupt data file moved to ${corruptPath}`)
    return corruptPath
  } catch (error) {
    log.error('Error preserving corrupt data file:', error)
    return null
  }
}

function loadData(): void {
  dataPath = getDataPath()

  if (!fs.existsSync(dataPath)) {
    data = createDefaultData()
    saveData()
    log.info('Created default data file')
    return
  }

  const loaded = readDataFile(dataPath)
  if (loaded) {
    data = loaded
    if (ensureMemberCodes()) saveData()
    log.info('Data loaded from file')
    return
  }

  const corruptPath = preserveCorruptFile()
  if (!corruptPath) {
    // Si no se pudo apartar el archivo dañado, no se guarda nada para no sobrescribirlo
    data = createDefaultData()
    dataPath = ''
    loadWarning = 'No se pudo leer el archivo de datos ni moverlo a un lugar seguro. Los cambios de esta sesión no se guardarán. Revisa el registro de la aplicación.'
    return
  }

  const backupPath = getBackupPath()
  const backup = fs.existsSync(backupPath) ? readDataFile(backupPath) : null
  if (backup) {
    data = backup
    ensureMemberCodes()
    saveData()
    loadWarning = `El archivo de datos estaba dañado y se restauró el último respaldo. Es posible que falten los cambios más recientes. El archivo dañado se guardó en:\n${corruptPath}`
    log.warn('Data restored from backup')
  } else {
    data = createDefaultData()
    loadWarning = `El archivo de datos estaba dañado y no había respaldo válido. Se inició con datos vacíos. El archivo dañado se guardó en:\n${corruptPath}`
    log.warn('No valid backup found, starting with default data')
  }
}

// Escritura atómica: archivo temporal + fsync + rename; la versión anterior queda en .bak
function saveData(): void {
  if (!dataPath) {
    log.warn('Save skipped: data file unavailable')
    return
  }

  const tmpPath = `${dataPath}.tmp`
  try {
    const fd = fs.openSync(tmpPath, 'w')
    try {
      fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf-8')
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    if (fs.existsSync(dataPath)) {
      fs.copyFileSync(dataPath, getBackupPath())
    }
    fs.renameSync(tmpPath, dataPath)
    log.info('Data saved')
    notifyDataChanged()
  } catch (error) {
    log.error('Error saving data:', error)
  }
}

function normalizeMemberCode(code: string): string {
  return code.trim().toUpperCase()
}

function getNextMemberCode(): string {
  const maxCode = data.members.reduce((max, member) => {
    const numeric = /^\d+$/.test(member.code ?? '') ? parseInt(member.code, 10) : 0
    return Math.max(max, numeric)
  }, MEMBER_CODE_START - 1)
  return String(maxCode + 1)
}

// Asigna código a los miembros que no lo tienen o lo tienen inválido/repetido (conserva el primero)
function ensureMemberCodes(): boolean {
  const usedCodes = new Set<string>()
  const needsCode: Member[] = []
  let changed = false

  for (const member of data.members) {
    const code = typeof member.code === 'string' ? normalizeMemberCode(member.code) : ''
    if (MEMBER_CODE_PATTERN.test(code) && !usedCodes.has(code)) {
      if (code !== member.code) {
        member.code = code
        changed = true
      }
      usedCodes.add(code)
    } else {
      member.code = ''
      needsCode.push(member)
    }
  }

  for (const member of needsCode) {
    member.code = getNextMemberCode()
    changed = true
  }

  return changed
}

// Agrega solo los elementos cuyo id no existe todavía, para que importar dos veces no duplique
function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[] | undefined
): { merged: T[]; added: number; skipped: number } {
  if (!Array.isArray(incoming)) return { merged: existing, added: 0, skipped: 0 }
  const ids = new Set(existing.map(item => item.id))
  const merged = [...existing]
  let skipped = 0
  for (const item of incoming) {
    if (!isRecord(item) || typeof item.id !== 'string' || ids.has(item.id)) {
      skipped++
      continue
    }
    ids.add(item.id)
    merged.push(item)
  }
  return { merged, added: merged.length - existing.length, skipped }
}

function findMemberByCode(code: string): Member | null | 'ambiguous' {
  const normalized = code.trim()
  if (!normalized) return null

  const memberCode = normalizeMemberCode(normalized)
  const byCode = data.members.find(m => m.code === memberCode)
  if (byCode) return byCode

  const byId = data.members.find(m => m.id === normalized)
  if (byId) return byId

  const lowerCode = normalized.toLowerCase()
  const matches = data.members.filter(
    m => m.phone === normalized || (m.email !== '' && m.email.toLowerCase() === lowerCode)
  )
  if (matches.length > 1) return 'ambiguous'
  return matches[0] ?? null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

let mainWindow: BrowserWindow | null = null
let checkInWindow: BrowserWindow | null = null
let receptionWindow: BrowserWindow | null = null

// La Recepción muestra miembros y asistencias en vivo; se refresca cada vez que se guardan datos
function notifyDataChanged(): void {
  if (receptionWindow && !receptionWindow.isDestroyed()) {
    receptionWindow.webContents.send('data-changed')
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const isMac = process.platform === 'darwin'

  // En macOS el primer menú siempre lleva el nombre de la app (Acerca de, Ocultar, Salir con ⌘Q).
  // Además, sin un menú Edición los atajos ⌘C/⌘V/⌘A no funcionan en los campos de texto.
  const platformMenus: MenuItemConstructorOptions[] = isMac
    ? [
        { role: 'appMenu' },
        {
          label: 'Edición',
          submenu: [
            { role: 'undo', label: 'Deshacer' },
            { role: 'redo', label: 'Rehacer' },
            { type: 'separator' },
            { role: 'cut', label: 'Cortar' },
            { role: 'copy', label: 'Copiar' },
            { role: 'paste', label: 'Pegar' },
            { role: 'selectAll', label: 'Seleccionar todo' }
          ]
        }
      ]
    : [
        {
          label: 'Archivo',
          submenu: [
            { role: 'quit' }
          ]
        }
      ]

  const menu = Menu.buildFromTemplate([
    ...platformMenus,
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { 
          label: 'Abrir Check-In',
          click: () => createCheckInWindow()
        },
        {
          label: 'Abrir Recepción',
          click: () => createReceptionWindow()
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window shown')
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

interface SecondaryWindowOptions {
  title: string
  width: number
  height: number
  minWidth: number
  minHeight: number
  // Nombre del preload y de la página HTML (p. ej. 'checkin' → preload/checkin.js y checkin.html)
  entry: SecondaryWindow
}

// Ventanas auxiliares (Check-In, Recepción): preload mínimo, sandbox y sin DevTools en producción
function createSecondaryWindow(options: SecondaryWindowOptions, onClosed: () => void): BrowserWindow {
  const win = new BrowserWindow({
    width: options.width,
    height: options.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    show: false,
    autoHideMenuBar: true,
    title: options.title,
    webPreferences: {
      preload: join(__dirname, `../preload/${options.entry}.js`),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: is.dev
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    log.info(`${options.title} window shown`)
  })

  win.on('closed', () => {
    onClosed()
    log.info(`${options.title} window closed`)
  })

  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${options.entry}.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${options.entry}.html`))
  }

  return win
}

function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function createCheckInWindow(): void {
  if (checkInWindow) {
    focusWindow(checkInWindow)
    return
  }
  checkInWindow = createSecondaryWindow(
    { title: 'Check-In', width: 600, height: 500, minWidth: 500, minHeight: 400, entry: 'checkin' },
    () => { checkInWindow = null }
  )
}

function createReceptionWindow(): void {
  if (receptionWindow) {
    focusWindow(receptionWindow)
    return
  }
  receptionWindow = createSecondaryWindow(
    { title: 'Recepción', width: 1100, height: 720, minWidth: 820, minHeight: 520, entry: 'reception' },
    () => { receptionWindow = null }
  )
}

function getReceptionState(): ReceptionState {
  const today = toLocalDateString()
  const membershipNames = new Map(data.memberships.map(m => [m.id, m.name]))

  const members: ReceptionMember[] = data.members
    .map(member => ({
      id: member.id,
      code: member.code,
      name: member.name,
      phone: member.phone,
      membershipName: membershipNames.get(member.membershipId) ?? 'Sin membresía',
      endDate: member.endDate,
      status: getMemberStatus(member, today)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const todayAttendances = data.attendances
    .filter(a => toLocalDateString(new Date(a.timestamp)) === today)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return { members, todayAttendances }
}

// Reglas comunes para el check-in del kiosco (por código) y de Recepción (por miembro)
function performCheckIn(member: Member): CheckInResult {
  if (member.status === 'frozen') return { status: 'frozen', memberName: member.name }
  if (isMembershipExpired(member)) return { status: 'expired', memberName: member.name }

  const now = Date.now()
  const hasRecentCheckIn = data.attendances.some(
    a => a.memberId === member.id && now - new Date(a.timestamp).getTime() < DUPLICATE_CHECK_IN_WINDOW_MS
  )
  if (hasRecentCheckIn) return { status: 'duplicate', memberName: member.name }

  const attendance: Attendance = {
    id: generateId(),
    memberId: member.id,
    memberName: member.name,
    timestamp: new Date(now).toISOString()
  }

  data.attendances.push(attendance)
  saveData()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('attendance-recorded')
  }
  return { status: 'success', memberName: member.name }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.gympos.app')

  loadData()

  ipcMain.handle('get-data', () => data)

  ipcMain.handle('add-member', (_event, member: Omit<Member, 'id' | 'code' | 'createdAt'>) => {
    const newMember: Member = {
      ...member,
      id: generateId(),
      code: getNextMemberCode(),
      createdAt: new Date().toISOString()
    }
    data.members.push(newMember)
    saveData()
    return newMember
  })

  ipcMain.handle('update-member', (_event, id: string, updates: Partial<Member>) => {
    const index = data.members.findIndex(m => m.id === id)
    if (index !== -1) {
      const current = data.members[index]
      // El id y el código no se cambian desde el formulario
      data.members[index] = { ...current, ...updates, id: current.id, code: current.code }
      saveData()
    }
  })

  ipcMain.handle('freeze-member', (_event, id: string): Member | null => {
    const member = data.members.find(m => m.id === id)
    if (!member || member.status === 'frozen' || isMembershipExpired(member)) return null
    member.status = 'frozen'
    member.frozenAt = toLocalDateString()
    saveData()
    return member
  })

  ipcMain.handle('unfreeze-member', (_event, id: string): Member | null => {
    const member = data.members.find(m => m.id === id)
    if (!member || member.status !== 'frozen') return null

    // Se devuelven los días congelados para que el miembro no pierda tiempo de su membresía
    const today = toLocalDateString()
    const endDate = normalizeDateString(member.endDate)
    const frozenAt = normalizeDateString(member.frozenAt)
    if (frozenAt && endDate) {
      const frozenDays = daysBetweenDateStrings(frozenAt, today)
      if (frozenDays > 0) member.endDate = addDaysToDateString(endDate, frozenDays)
    }

    member.status = 'active'
    delete member.frozenAt
    saveData()
    return member
  })

  ipcMain.handle('delete-member', (_event, id: string) => {
    data.members = data.members.filter(m => m.id !== id)
    saveData()
  })

  ipcMain.handle('add-membership', (_event, membership: Omit<Membership, 'id'>) => {
    const newMembership: Membership = {
      ...membership,
      id: generateId()
    }
    data.memberships.push(newMembership)
    saveData()
    return newMembership
  })

  ipcMain.handle('update-membership', (_event, id: string, updates: Partial<Membership>) => {
    const index = data.memberships.findIndex(m => m.id === id)
    if (index !== -1) {
      data.memberships[index] = { ...data.memberships[index], ...updates }
      saveData()
    }
  })

  ipcMain.handle('delete-membership', (_event, id: string) => {
    data.memberships = data.memberships.filter(m => m.id !== id)
    saveData()
  })

  ipcMain.handle('add-product', (_event, product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: generateId()
    }
    data.products.push(newProduct)
    saveData()
    return newProduct
  })

  ipcMain.handle('update-product', (_event, id: string, updates: Partial<Product>) => {
    const index = data.products.findIndex(p => p.id === id)
    if (index !== -1) {
      data.products[index] = { ...data.products[index], ...updates }
      saveData()
    }
  })

  ipcMain.handle('delete-product', (_event, id: string) => {
    data.products = data.products.filter(p => p.id !== id)
    saveData()
  })

  ipcMain.handle('add-sale', (_event, sale: Omit<Sale, 'id'>): AddSaleResult => {
    if (!Array.isArray(sale.items) || sale.items.length === 0) {
      return { ok: false, error: 'La venta no tiene productos' }
    }

    // Se valida contra el stock actual del proceso main; la pantalla puede tener datos viejos
    const requested = new Map<string, number>()
    for (const item of sale.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return { ok: false, error: `Cantidad inválida para ${item.productName}` }
      }
      requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity)
    }
    for (const [productId, quantity] of requested) {
      const product = data.products.find(p => p.id === productId)
      if (!product) {
        return { ok: false, error: 'Uno de los productos de la venta ya no existe' }
      }
      if (product.stock < quantity) {
        return { ok: false, error: `Stock insuficiente de ${product.name}: quedan ${product.stock}` }
      }
    }

    const newSale: Sale = {
      ...sale,
      id: generateId()
    }
    data.sales.push(newSale)
    
    for (const item of sale.items) {
      const product = data.products.find(p => p.id === item.productId)
      if (product) {
        product.stock -= item.quantity
      }
    }
    
    saveData()
    return { ok: true, sale: newSale }
  })

  ipcMain.handle('add-entry', (_event, entry: Omit<Entry, 'id'>) => {
    const newEntry: Entry = {
      ...entry,
      id: generateId()
    }
    data.entries.push(newEntry)
    
    const product = data.products.find(p => p.id === entry.productId)
    if (product) {
      product.stock += entry.quantity
    }
    
    saveData()
    return newEntry
  })

  ipcMain.handle('add-membership-sale', (_event, sale: Omit<MembershipSale, 'id'>) => {
    const newSale: MembershipSale = {
      ...sale,
      id: generateId()
    }
    data.membershipSales.push(newSale)
    
    for (const memberId of sale.memberIds) {
      const member = data.members.find(m => m.id === memberId)
      if (member) {
        member.membershipId = sale.membershipId
        member.startDate = sale.purchaseDate
        member.endDate = sale.expirationDate
        member.status = 'active'
      }
    }
    
    saveData()
    return newSale
  })

  ipcMain.handle('update-config', (_event, config: BusinessConfig) => {
    data.config = config
    saveData()
  })

  ipcMain.handle('import-data', (_event, importedData: Partial<AppData>): ImportSummary => {
    if (!isRecord(importedData)) return { data, added: 0, skipped: 0 }

    let added = 0
    let skipped = 0
    const merge = <T extends { id: string }>(existing: T[], incoming: T[] | undefined): T[] => {
      const result = mergeById(existing, incoming)
      added += result.added
      skipped += result.skipped
      return result.merged
    }

    data.members = merge(data.members, importedData.members)
    data.memberships = merge(data.memberships, importedData.memberships)
    data.products = merge(data.products, importedData.products)
    data.sales = merge(data.sales, importedData.sales)
    data.entries = merge(data.entries, importedData.entries)
    data.membershipSales = merge(data.membershipSales, importedData.membershipSales)
    data.attendances = merge(data.attendances, importedData.attendances)
    ensureMemberCodes()
    if (added > 0) saveData()
    return { data, added, skipped }
  })

  ipcMain.handle('import-csv', (_event, csvData: { type: 'members' | 'products' | 'memberships', data: string }): ImportSummary => {
    const { type } = csvData
    if (type !== 'members' && type !== 'products' && type !== 'memberships') {
      return { data, added: 0, skipped: 0, error: 'Tipo de importación no válido.' }
    }

    const { delimiter, rows: allRows, unclosedQuote } = parseCsv(csvData.data)
    if (unclosedQuote) {
      // Una comilla sin cerrar se traga el resto del archivo; es más seguro no importar nada
      return {
        data,
        added: 0,
        skipped: 0,
        error: 'El archivo tiene un campo entre comillas que nunca se cierra. Revíselo y vuelva a intentar.'
      }
    }

    const [headerRow, ...rows] = allRows
    if (!headerRow || rows.length === 0) return { data, added: 0, skipped: 0 }

    const headers = headerRow.map(normalizeHeader)
    if (!headers.includes('name')) {
      return { data, added: 0, skipped: 0, error: 'El archivo no tiene una columna "name" o "nombre".' }
    }

    const today = toLocalDateString()
    const warnings: string[] = []
    let added = 0
    let skipped = 0
    let duplicates = 0

    const readNumber = (record: Record<string, string>, field: string, label: string, rowNumber: number): number | null => {
      const raw = record[field] ?? ''
      const value = parseCsvNumber(raw, delimiter)
      if (raw !== '' && value === null) {
        warnings.push(`Fila ${rowNumber}: ${label} "${raw}" no es un número; se usó el valor por defecto.`)
      }
      return value
    }

    rows.forEach((values, index) => {
      // La fila 1 es el encabezado
      const rowNumber = index + 2
      const record: Record<string, string> = {}
      headers.forEach((header, column) => {
        record[header] = (values[column] ?? '').trim()
      })
      const name = record.name ?? ''

      // Una fila sin nombre no se puede identificar después; se omite
      if (!name) {
        skipped++
        return
      }

      if (type === 'members') {
        const code = normalizeMemberCode(record.code ?? '')
        const phone = record.phone ?? ''
        const email = record.email ?? ''
        // Mismo código, o mismo nombre con el mismo teléfono/email (si el archivo los trae)
        const isDuplicate = data.members.some(m =>
          (code !== '' && m.code === code) ||
          (sameText(m.name, name) && (phone === '' || m.phone === phone) && (email === '' || sameText(m.email, email)))
        )
        if (isDuplicate) {
          skipped++
          duplicates++
          return
        }

        const startDate = parseCsvDate(record.startdate)
        if (record.startdate && !startDate) {
          warnings.push(`Fila ${rowNumber}: fecha de inicio "${record.startdate}" no válida; se usó la fecha de hoy.`)
        }
        const endDate = parseCsvDate(record.enddate)
        if (record.enddate && !endDate) {
          warnings.push(`Fila ${rowNumber}: fecha de vencimiento "${record.enddate}" no válida; el miembro quedó sin vencimiento.`)
        }

        const parsedStatus = parseCsvMemberStatus(record.status)
        if (parsedStatus === null) {
          warnings.push(`Fila ${rowNumber}: estado "${record.status}" no reconocido; el estado se decide por la fecha de vencimiento.`)
        }
        const status = parsedStatus ?? 'active'

        // La columna de membresía puede traer el id o el nombre
        const membershipValue = record.membershipid ?? ''
        const membership = membershipValue
          ? data.memberships.find(m => m.id === membershipValue || sameText(m.name, membershipValue))
          : undefined
        if (membershipValue && !membership) {
          warnings.push(`Fila ${rowNumber}: membresía "${membershipValue}" no existe; el miembro quedó sin membresía.`)
        }

        const member: Member = {
          id: generateId(),
          code,
          name,
          phone,
          email,
          membershipId: membership?.id ?? '',
          startDate: startDate ?? today,
          endDate: endDate ?? '',
          status,
          // Sin fecha de congelamiento no se podrían devolver los días al descongelar
          ...(status === 'frozen' ? { frozenAt: today } : {}),
          createdAt: new Date().toISOString()
        }
        data.members.push(member)
        added++
      } else if (type === 'products') {
        const category = record.category ?? ''
        if (data.products.some(p => sameText(p.name, name) && sameText(p.category, category))) {
          skipped++
          duplicates++
          return
        }
        const product: Product = {
          id: generateId(),
          name,
          category,
          price: readNumber(record, 'price', 'precio', rowNumber) ?? 0,
          stock: Math.max(0, Math.round(readNumber(record, 'stock', 'stock', rowNumber) ?? 0))
        }
        data.products.push(product)
        added++
      } else {
        if (data.memberships.some(m => sameText(m.name, name))) {
          skipped++
          duplicates++
          return
        }
        const durationDays = readNumber(record, 'durationdays', 'duración', rowNumber)
        const membership: Membership = {
          id: generateId(),
          name,
          price: readNumber(record, 'price', 'precio', rowNumber) ?? 0,
          durationDays: durationDays !== null && durationDays > 0 ? Math.round(durationDays) : 30,
          hasPromotion: parseCsvBoolean(record.haspromotion),
          promotionType: parseCsvPromotionType(record.promotiontype),
          promotionDiscount: readNumber(record, 'promotiondiscount', 'descuento', rowNumber) ?? 0,
          includesAnnualMaintenance: parseCsvBoolean(record.includesannualmaintenance)
        }
        data.memberships.push(membership)
        added++
      }
    })

    if (added > 0) {
      ensureMemberCodes()
      saveData()
    }
    return { data, added, skipped, duplicates, warnings }
  })

  ipcMain.handle('check-in', (_event, code: string): CheckInResult => {
    const member = findMemberByCode(code)
    if (member === 'ambiguous') return { status: 'ambiguous' }
    if (!member) return { status: 'not_found' }
    return performCheckIn(member)
  })

  ipcMain.handle('reception-get-state', (): ReceptionState => getReceptionState())

  ipcMain.handle('reception-check-in', (_event, memberId: string): CheckInResult => {
    const member = data.members.find(m => m.id === memberId)
    if (!member) return { status: 'not_found' }
    return performCheckIn(member)
  })

  ipcMain.handle('open-window', (_event, kind: SecondaryWindow) => {
    if (kind === 'checkin') createCheckInWindow()
    else if (kind === 'reception') createReceptionWindow()
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  if (loadWarning && mainWindow) {
    const warning = loadWarning
    const targetWindow = mainWindow
    targetWindow.once('ready-to-show', () => {
      dialog.showMessageBox(targetWindow, {
        type: 'warning',
        title: 'Problema con los datos',
        message: 'Problema al cargar los datos',
        detail: warning
      })
    })
  }

  // En macOS la app sigue abierta al cerrar la ventana principal; el ícono del Dock la vuelve a abrir
  // aunque la ventana de Check-In siga abierta
  app.on('activate', function () {
    if (!mainWindow) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

log.info('Main process initialized')
