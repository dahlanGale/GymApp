import { contextBridge, ipcRenderer } from 'electron'

import type {
  Member,
  Membership,
  Product,
  Sale,
  Entry,
  MembershipSale,
  BusinessConfig,
  AppData,
  AddSaleResult,
  ImportSummary
} from '../shared/types'

const api = {
  getData: (): Promise<AppData> => ipcRenderer.invoke('get-data'),
  addMember: (member: Omit<Member, 'id' | 'code' | 'createdAt'>): Promise<Member> =>
    ipcRenderer.invoke('add-member', member),
  updateMember: (id: string, member: Partial<Member>): Promise<void> =>
    ipcRenderer.invoke('update-member', id, member),
  freezeMember: (id: string): Promise<Member | null> => ipcRenderer.invoke('freeze-member', id),
  unfreezeMember: (id: string): Promise<Member | null> => ipcRenderer.invoke('unfreeze-member', id),
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
  addSale: (sale: Omit<Sale, 'id'>): Promise<AddSaleResult> => ipcRenderer.invoke('add-sale', sale),
  addEntry: (entry: Omit<Entry, 'id'>): Promise<Entry> => ipcRenderer.invoke('add-entry', entry),
  addMembershipSale: (sale: Omit<MembershipSale, 'id'>): Promise<MembershipSale> => 
    ipcRenderer.invoke('add-membership-sale', sale),
  updateConfig: (config: BusinessConfig): Promise<void> => 
    ipcRenderer.invoke('update-config', config),
  importData: (data: Partial<AppData>): Promise<ImportSummary> => 
    ipcRenderer.invoke('import-data', data),
  importCsv: (csvData: { type: 'members' | 'products' | 'memberships', data: string }): Promise<AppData> =>
    ipcRenderer.invoke('import-csv', csvData),
  onAttendanceRecorded: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('attendance-recorded', listener)
    return () => {
      ipcRenderer.removeListener('attendance-recorded', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
