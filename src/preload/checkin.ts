import { contextBridge, ipcRenderer } from 'electron'

export type CheckInResult =
  | { status: 'not_found' }
  | { status: 'ambiguous' }
  | { status: 'success' | 'duplicate' | 'expired' | 'frozen'; memberName: string }

const checkInApi = {
  checkIn: (code: string): Promise<CheckInResult> => ipcRenderer.invoke('check-in', code)
}

contextBridge.exposeInMainWorld('checkInApi', checkInApi)

export type CheckInApi = typeof checkInApi
