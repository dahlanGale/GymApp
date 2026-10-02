import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '../shared/types'

// Las versiones se publican en GitHub Releases (ver .github/workflows/release.yml)
const RELEASES_URL = 'https://github.com/dahlanGale/GymApp/releases'
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

// macOS no deja que una app sin firma Developer ID se reemplace sola (Squirrel.Mac exige la firma),
// así que ahí solo se avisa y se ofrece el enlace de descarga
const canInstallUpdates = process.platform !== 'darwin'

let state: UpdateState = { status: 'idle' }
let getTargetWindow: () => BrowserWindow | null = () => null

function setState(next: UpdateState): void {
  state = next
  const win = getTargetWindow()
  if (win && !win.isDestroyed()) win.webContents.send('update-state', state)
}

function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((error: unknown) => {
    // Sin internet o sin releases publicados: se vuelve a intentar en la siguiente revisión
    log.warn('Update check failed:', error)
  })
}

export function setupAutoUpdates(targetWindow: () => BrowserWindow | null): void {
  getTargetWindow = targetWindow

  ipcMain.handle('get-update-state', (): UpdateState => state)
  ipcMain.handle('get-app-version', (): string => app.getVersion())

  ipcMain.handle('install-update', () => {
    if (canInstallUpdates && state.status === 'downloaded') autoUpdater.quitAndInstall()
  })

  ipcMain.handle('open-update-download', () => {
    // La URL se arma aquí con la versión que reportó el updater, nunca con datos del renderer
    if (state.status === 'available' && /^\d+\.\d+\.\d+/.test(state.version)) {
      shell.openExternal(`${RELEASES_URL}/tag/v${state.version}`)
    }
  })

  // En desarrollo no hay una versión instalada contra la cual comparar
  if (is.dev || !app.isPackaged) return

  autoUpdater.logger = log
  autoUpdater.autoDownload = canInstallUpdates
  autoUpdater.autoInstallOnAppQuit = canInstallUpdates

  autoUpdater.on('update-available', info => {
    setState(
      canInstallUpdates
        ? { status: 'downloading', version: info.version, percent: 0 }
        : { status: 'available', version: info.version }
    )
  })
  autoUpdater.on('download-progress', progress => {
    if (state.status === 'downloading') setState({ ...state, percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', info => {
    setState({ status: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', error => {
    log.warn('Auto-update error:', error)
    // Si falló la descarga se oculta el aviso; la siguiente revisión lo vuelve a intentar
    if (state.status === 'downloading') setState({ status: 'idle' })
  })

  checkForUpdates()
  setInterval(checkForUpdates, CHECK_INTERVAL_MS)
}
