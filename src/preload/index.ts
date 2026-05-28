import { contextBridge, ipcRenderer } from 'electron'

export interface Member {
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

export interface Membership {
  id: string
  name: string
  price: number
  durationDays: number
  hasPromotion: boolean
  promotionType: 'new_client' | 'couple' | 'no_maintenance' | null
  promotionDiscount: number
  includesAnnualMaintenance: boolean
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
}

export interface Sale {
  id: string
  memberId: string | null
  memberName: string | null
  items: SaleItem[]
  total: number
  paymentMethod: 'cash' | 'card'
  date: string
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface Entry {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  supplier: string
  date: string
}

export interface MembershipSale {
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

export interface Attendance {
  id: string
  memberId: string
  memberName: string
  timestamp: string
}

export interface BusinessConfig {
  gymName: string
  address: string
  phone: string
  email: string
  annualMaintenanceCost: number
}

export interface AppData {
  members: Member[]
  memberships: Membership[]
  products: Product[]
  sales: Sale[]
  entries: Entry[]
  membershipSales: MembershipSale[]
  attendances: Attendance[]
  config: BusinessConfig
}

const api = {
  getData: (): Promise<AppData> => ipcRenderer.invoke('get-data'),
  saveData: (data: AppData): Promise<void> => ipcRenderer.invoke('save-data', data),
  addMember: (member: Omit<Member, 'id' | 'createdAt'>): Promise<Member> =>
    ipcRenderer.invoke('add-member', member),
  updateMember: (id: string, member: Partial<Member>): Promise<void> =>
    ipcRenderer.invoke('update-member', id, member),
  deleteMember: (id: string): Promise<void> => ipcRenderer.invoke('delete-member', id),
  addMembership: (membership: Omit<Membership, 'id'>): Promise<Membership> =>
    ipcRenderer.invoke('add-membership', membership),
  updateMembership: (id: string, membership: Partial<Membership>): Promise<void> =>
    ipcRenderer.invoke('update-membership', id, membership),
  deleteMembership: (id: string): Promise<void> => ipcRenderer.invoke('delete-membership', id),
  addProduct: (product: Omit<Product, 'id'>): Promise<Product> =>
    ipcRenderer.invoke('add-product', product),
  updateProduct: (id: string, product: Partial<Product>): Promise<void> =>
    ipcRenderer.invoke('update-product', id, product),
  deleteProduct: (id: string): Promise<void> => ipcRenderer.invoke('delete-product', id),
  addSale: (sale: Omit<Sale, 'id'>): Promise<Sale> => ipcRenderer.invoke('add-sale', sale),
  addEntry: (entry: Omit<Entry, 'id'>): Promise<Entry> => ipcRenderer.invoke('add-entry', entry),
  addMembershipSale: (sale: Omit<MembershipSale, 'id'>): Promise<MembershipSale> => 
    ipcRenderer.invoke('add-membership-sale', sale),
  updateConfig: (config: BusinessConfig): Promise<void> => 
    ipcRenderer.invoke('update-config', config),
  importData: (data: Partial<AppData>): Promise<AppData> => 
    ipcRenderer.invoke('import-data', data),
  importCsv: (csvData: { type: 'members' | 'products' | 'memberships', data: string }): Promise<AppData> =>
    ipcRenderer.invoke('import-csv', csvData),
  searchMemberByCode: (code: string): Promise<Member | null> =>
    ipcRenderer.invoke('search-member-by-code', code),
  recordAttendance: (memberId: string): Promise<{ attendance: Attendance, member: Member }> =>
    ipcRenderer.invoke('record-attendance', memberId),
  openCheckInWindow: (): Promise<void> =>
    ipcRenderer.invoke('open-checkin-window')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
