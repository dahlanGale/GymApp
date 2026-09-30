import { contextBridge, ipcRenderer } from 'electron'
import type { CheckInResult } from '../shared/types'

const checkInApi = {
  checkIn: (code: string): Promise<CheckInResult> => ipcRenderer.invoke('check-in', code)
}

contextBridge.exposeInMainWorld('checkInApi', checkInApi)

export type CheckInApi = typeof checkInApi
