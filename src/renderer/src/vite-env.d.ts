import type { Api } from '../../preload'
import type { CheckInApi } from '../../preload/checkin'

declare global {
  interface Window {
    // Ventana principal (src/preload/index.ts)
    api: Api
    // Ventana de check-in (src/preload/checkin.ts)
    checkInApi: CheckInApi
  }
}

export {}
