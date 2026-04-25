import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import * as fs from 'fs'

log.initialize()
log.info('Application starting...')

interface Member {
  id: string
  name: string
  phone: string
  email: string
  membershipId: string
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'frozen'
  createdAt: string
}

interface Membership {
  id: string
  name: string
  price: number
  durationDays: number
  hasPromotion: boolean
  promotionType: 'new_client' | 'couple' | 'no_maintenance' | null
  promotionDiscount: number
  includesAnnualMaintenance: boolean
}

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
}

interface SaleItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

interface Sale {
  id: string
  memberId: string | null
  memberName: string | null
  items: SaleItem[]
  total: number
  paymentMethod: 'cash' | 'card'
  date: string
}

interface Entry {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  supplier: string
  date: string
}

interface MembershipSale {
  id: string
  membershipId: string
  membershipName: string
  memberIds: string[]
  memberNames: string[]
  purchaseDate: string
  expirationDate: string
  price: number
  paymentMethod: 'cash' | 'card'
}

interface BusinessConfig {
  gymName: string
  address: string
  phone: string
  email: string
  annualMaintenanceCost: number
}

interface AppData {
  members: Member[]
  memberships: Membership[]
  products: Product[]
  sales: Sale[]
  entries: Entry[]
  membershipSales: MembershipSale[]
  config: BusinessConfig
}

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
  config: {
    gymName: 'Mi Gym',
    address: '',
    phone: '',
    email: '',
    annualMaintenanceCost: 0
  }
}

let data: AppData = { ...defaultData }
let dataPath: string

function getDataPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'gym-pos-data.json')
}

function loadData(): void {
  try {
    dataPath = getDataPath()
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, 'utf-8')
      const parsed = JSON.parse(fileData)
      data = { ...defaultData, ...parsed }
      log.info('Data loaded from file')
    } else {
      saveData()
      log.info('Created default data file')
    }
  } catch (error) {
    log.error('Error loading data:', error)
    data = { ...defaultData }
  }
}

function saveData(): void {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    log.info('Data saved')
  } catch (error) {
    log.error('Error saving data:', error)
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

let mainWindow: BrowserWindow | null = null

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.gympos.app')

  loadData()

  ipcMain.handle('get-data', () => data)

  ipcMain.handle('save-data', (_event, newData: AppData) => {
    data = newData
    saveData()
  })

  ipcMain.handle('add-member', (_event, member: Omit<Member, 'id' | 'createdAt'>) => {
    const newMember: Member = {
      ...member,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    data.members.push(newMember)
    saveData()
    return newMember
  })

  ipcMain.handle('update-member', (_event, id: string, updates: Partial<Member>) => {
    const index = data.members.findIndex(m => m.id === id)
    if (index !== -1) {
      data.members[index] = { ...data.members[index], ...updates }
      saveData()
    }
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

  ipcMain.handle('add-sale', (_event, sale: Omit<Sale, 'id'>) => {
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
    return newSale
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

  ipcMain.handle('import-data', (_event, importedData: Partial<AppData>) => {
    if (importedData.members) {
      data.members = [...data.members, ...importedData.members]
    }
    if (importedData.memberships) {
      data.memberships = [...data.memberships, ...importedData.memberships]
    }
    if (importedData.products) {
      data.products = [...data.products, ...importedData.products]
    }
    if (importedData.sales) {
      data.sales = [...data.sales, ...importedData.sales]
    }
    if (importedData.entries) {
      data.entries = [...data.entries, ...importedData.entries]
    }
    if (importedData.membershipSales) {
      data.membershipSales = [...data.membershipSales, ...importedData.membershipSales]
    }
    saveData()
    return data
  })

  ipcMain.handle('import-csv', (_event, csvData: { type: 'members' | 'products' | 'memberships', data: string }) => {
    const lines = csvData.data.split('\n').filter(line => line.trim())
    if (lines.length < 2) return data

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ''
      })

      if (csvData.type === 'members') {
        const member: Member = {
          id: generateId(),
          name: record.name || '',
          phone: record.phone || '',
          email: record.email || '',
          membershipId: record.membershipid || '',
          startDate: record.startdate || new Date().toISOString().split('T')[0],
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

    saveData()
    return data
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

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
