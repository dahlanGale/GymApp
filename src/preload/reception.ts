import { contextBridge, ipcRenderer } from 'electron'
import type { CheckInResult, ReceptionState } from '../shared/types'

const receptionApi = {
  getState: (): Promise<ReceptionState> => ipcRenderer.invoke('reception-get-state'),
  checkIn: (memberId: string): Promise<CheckInResult> => ipcRenderer.invoke('reception-check-in', memberId),
  onDataChanged: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('data-changed', listener)
    return () => {
      ipcRenderer.removeListener('data-changed', listener)
    }
  }
}

contextBridge.exposeInMainWorld('receptionApi', receptionApi)

export type ReceptionApi = typeof receptionApi
