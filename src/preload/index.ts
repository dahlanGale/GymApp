import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

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
  ImportSummary,
  LinkNfcResult,
  SecurityResult,
  SecurityStatus,
  SecondaryWindow,
  UpdateState
} from '../shared/types'

const api = {
  getData: (): Promise<AppData> => ipcRenderer.invoke('get-data'),
  addMember: (member: Omit<Member, 'id' | 'code' | 'createdAt'>): Promise<Member> =>
    ipcRenderer.invoke('add-member', member),
  updateMember: (id: string, member: Partial<Member>): Promise<void> =>
    ipcRenderer.invoke('update-member', id, member),
  freezeMember: (id: string): Promise<Member | null> => ipcRenderer.invoke('freeze-member', id),
  unfreezeMember: (id: string): Promise<Member | null> => ipcRenderer.invoke('unfreeze-member', id),
  linkNfcTag: (memberId: string, tag: string): Promise<LinkNfcResult> =>
    ipcRenderer.invoke('link-nfc-tag', memberId, tag),
  unlinkNfcTag: (memberId: string): Promise<void> => ipcRenderer.invoke('unlink-nfc-tag', memberId),
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
  importCsv: (csvData: { type: 'members' | 'products' | 'memberships', data: string }): Promise<ImportSummary> =>
    ipcRenderer.invoke('import-csv', csvData),
  openWindow: (kind: SecondaryWindow): Promise<void> => ipcRenderer.invoke('open-window', kind),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getSecurityStatus: (): Promise<SecurityStatus> => ipcRenderer.invoke('security-status'),
  unlock: (password: string): Promise<boolean> => ipcRenderer.invoke('security-unlock', password),
  lock: (): Promise<SecurityStatus> => ipcRenderer.invoke('security-lock'),
  setPassword: (current: string, next: string): Promise<SecurityResult> =>
    ipcRenderer.invoke('security-set-password', current, next),
  removePassword: (current: string): Promise<SecurityResult> =>
    ipcRenderer.invoke('security-remove-password', current),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke('get-update-state'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
  openUpdateDownload: (): Promise<void> => ipcRenderer.invoke('open-update-download'),
  onUpdateState: (callback: (state: UpdateState) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, state: UpdateState): void => callback(state)
    ipcRenderer.on('update-state', listener)
    return () => {
      ipcRenderer.removeListener('update-state', listener)
    }
  },
  // Se dispara cada vez que el proceso main guarda datos (check-ins del kiosco o de Recepción incluidos)
  onDataChanged: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('data-changed', listener)
    return () => {
      ipcRenderer.removeListener('data-changed', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
