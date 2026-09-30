import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
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
  BusinessConfig,
  AppData
} from '../shared/types'

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

function detectCsvDelimiter(text: string): ',' | ';' {
  // Excel en español suele exportar con punto y coma
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

// RFC 4180: un campo entre comillas puede contener delimitadores, saltos de línea y comillas escapadas ("")
function parseCsv(text: string): string[][] {
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

    if (char === '"') {
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

  return rows.filter(values => values.some(value => value.trim() !== ''))
}

const CSV_MEMBER_STATUSES: Record<string, Member['status']> = {
  active: 'active',
  activo: 'active',
  expired: 'expired',
  expirado: 'expired',
  frozen: 'frozen',
  congelado: 'frozen'
}

function parseMemberStatus(value: string | undefined): Member['status'] {
  return CSV_MEMBER_STATUSES[(value ?? '').trim().toLowerCase()] ?? 'active'
}

const PROMOTION_TYPES: NonNullable<Membership['promotionType']>[] = ['new_client', 'couple', 'no_maintenance']

function parsePromotionType(value: string | undefined): Membership['promotionType'] {
  const normalized = (value ?? '').trim().toLowerCase()
  return PROMOTION_TYPES.find(type => type === normalized) ?? null
}

function parseCsvBoolean(value: string | undefined): boolean {
  return ['true', '1', 'si', 'sí', 'yes'].includes((value ?? '').trim().toLowerCase())
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateString(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDaysToDateString(value: string, days: number): string {
  const date = parseDateString(value)
  date.setDate(date.getDate() + days)
  return getLocalDateString(date)
}

function daysBetweenDateStrings(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / msPerDay)
}

function isMembershipExpired(member: Member): boolean {
  if (member.status === 'expired') return true
  const endDate = member.endDate?.slice(0, 10)
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return true
  return endDate < getLocalDateString(new Date())
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

  const menu = Menu.buildFromTemplate([
    {
      label: 'Archivo',
      submenu: [
        { role: 'quit' }
      ]
    },
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
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)

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

function createCheckInWindow(): void {
  if (checkInWindow) {
    if (checkInWindow.isMinimized()) checkInWindow.restore()
    checkInWindow.show()
    checkInWindow.focus()
    return
  }

  checkInWindow = new BrowserWindow({
    width: 600,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    title: 'Check-In',
    webPreferences: {
      preload: join(__dirname, '../preload/checkin.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: is.dev
    }
  })

  checkInWindow.on('ready-to-show', () => {
    checkInWindow?.show()
    log.info('Check-in window shown')
  })

  checkInWindow.on('closed', () => {
    checkInWindow = null
    log.info('Check-in window closed')
  })

  checkInWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    checkInWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/checkin.html')
  } else {
    checkInWindow.loadFile(join(__dirname, '../renderer/checkin.html'))
  }
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
    member.frozenAt = getLocalDateString(new Date())
    saveData()
    return member
  })

  ipcMain.handle('unfreeze-member', (_event, id: string): Member | null => {
    const member = data.members.find(m => m.id === id)
    if (!member || member.status !== 'frozen') return null

    // Se devuelven los días congelados para que el miembro no pierda tiempo de su membresía
    const today = getLocalDateString(new Date())
    const endDate = member.endDate?.slice(0, 10)
    if (isDateString(member.frozenAt) && isDateString(endDate)) {
      const frozenDays = daysBetweenDateStrings(member.frozenAt, today)
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
    const [headerRow, ...rows] = parseCsv(csvData.data)
    if (!headerRow || rows.length === 0) return { data, added: 0, skipped: 0 }

    const headers = headerRow.map(h => h.trim().toLowerCase())
    let added = 0
    let skipped = 0

    for (const values of rows) {
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = (values[index] ?? '').trim()
      })

      // Una fila sin nombre no se puede identificar después; se omite
      if (!record.name) {
        skipped++
        continue
      }

      if (csvData.type === 'members') {
        const member: Member = {
          id: generateId(),
          code: normalizeMemberCode(record.code || ''),
          name: record.name,
          phone: record.phone || '',
          email: record.email || '',
          membershipId: record.membershipid || '',
          startDate: isDateString(record.startdate) ? record.startdate : getLocalDateString(new Date()),
          endDate: isDateString(record.enddate) ? record.enddate : '',
          status: parseMemberStatus(record.status),
          createdAt: new Date().toISOString()
        }
        data.members.push(member)
      } else if (csvData.type === 'products') {
        const product: Product = {
          id: generateId(),
          name: record.name,
          category: record.category || '',
          price: parseFloat(record.price) || 0,
          stock: Math.max(0, parseInt(record.stock, 10) || 0)
        }
        data.products.push(product)
      } else if (csvData.type === 'memberships') {
        const membership: Membership = {
          id: generateId(),
          name: record.name,
          price: parseFloat(record.price) || 0,
          durationDays: parseInt(record.durationdays, 10) || 30,
          hasPromotion: parseCsvBoolean(record.haspromotion),
          promotionType: parsePromotionType(record.promotiontype),
          promotionDiscount: parseFloat(record.promotiondiscount) || 0,
          includesAnnualMaintenance: parseCsvBoolean(record.includesannualmaintenance)
        }
        data.memberships.push(membership)
      }
      added++
    }

    if (added > 0) {
      ensureMemberCodes()
      saveData()
    }
    return { data, added, skipped }
  })

      if (csvData.type === 'members') {
        const member: Member = {
          id: generateId(),
          code: normalizeMemberCode(record.code || ''),
          name: record.name || '',
          phone: record.phone || '',
          email: record.email || '',
          membershipId: record.membershipid || '',
          startDate: record.startdate || getLocalDateString(new Date()),
          endDate: record.enddate || '',
          status: (record.status as 'active' | 'expired' | 'frozen') || 'active',
          createdAt: new Date().toISOString()
        }
        data.members.push(member)
      } else if (csvData.type === 'products') {
        const product: Product = {
          id: generateId(),
          name: record.name || '',
          category: record.category || '',
          price: parseFloat(record.price) || 0,
          stock: parseInt(record.stock) || 0
        }
        data.products.push(product)
      } else if (csvData.type === 'memberships') {
        const membership: Membership = {
          id: generateId(),
          name: record.name || '',
          price: parseFloat(record.price) || 0,
          durationDays: parseInt(record.durationdays) || 30,
          hasPromotion: record.haspromotion === 'true',
          promotionType: record.promotiontype as 'new_client' | 'couple' | 'no_maintenance' | null,
          promotionDiscount: parseFloat(record.promotiondiscount) || 0,
          includesAnnualMaintenance: record.includesannualmaintenance === 'true'
        }
        data.memberships.push(membership)
      }
    }

    ensureMemberCodes()
    saveData()
    return data
  })

  ipcMain.handle('check-in', (_event, code: string): CheckInResult => {
    const member = findMemberByCode(code)
    if (member === 'ambiguous') return { status: 'ambiguous' }
    if (!member) return { status: 'not_found' }

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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

log.info('Main process initialized')
