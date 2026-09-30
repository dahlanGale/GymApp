// Tipos de dominio compartidos entre main, preload y renderer

export interface Member {
  id: string
  // Código corto (numérico) para el check-in y la credencial con código de barras
  code: string
  name: string
  phone: string
  email: string
  membershipId: string
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'frozen'
  // Fecha local (YYYY-MM-DD) en que se congeló; al descongelar se recorre endDate esos días
  frozenAt?: string
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

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  price: number
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

export type AddSaleResult =
  | { ok: true; sale: Sale }
  | { ok: false; error: string }

export interface ImportSummary {
  data: AppData
  added: number
  skipped: number
}

export type CheckInResult =
  | { status: 'not_found' }
  | { status: 'ambiguous' }
  | { status: 'success' | 'duplicate' | 'expired' | 'frozen'; memberName: string }

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
