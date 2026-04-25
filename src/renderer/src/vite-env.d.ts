import { Member, Membership, Product, Sale, SaleItem, AppData } from '../src/App'

declare global {
  interface Window {
    api: {
      getData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<void>
      addMember: (member: Omit<Member, 'id' | 'createdAt'>) => Promise<Member>
      updateMember: (id: string, member: Partial<Member>) => Promise<void>
      deleteMember: (id: string) => Promise<void>
      addMembership: (membership: Omit<Membership, 'id'>) => Promise<Membership>
      updateMembership: (id: string, membership: Partial<Membership>) => Promise<void>
      deleteMembership: (id: string) => Promise<void>
      addProduct: (product: Omit<Product, 'id'>) => Promise<Product>
      updateProduct: (id: string, product: Partial<Product>) => Promise<void>
      deleteProduct: (id: string) => Promise<void>
      addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>
    }
  }
}

export {}
