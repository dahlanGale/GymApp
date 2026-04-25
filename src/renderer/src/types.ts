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
  config: BusinessConfig
}

export type Page = 'dashboard' | 'members' | 'sales' | 'products' | 'memberships' | 'entries' | 'membership-sales' | 'config'
