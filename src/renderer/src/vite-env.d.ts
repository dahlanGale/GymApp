import type { Api } from '../../preload'
import type { CheckInApi } from '../../preload/checkin'
import type { ReceptionApi } from '../../preload/reception'

declare global {
  interface Window {
    // Ventana principal (src/preload/index.ts)
    api: Api
    // Ventana de check-in (src/preload/checkin.ts)
    checkInApi: CheckInApi
    // Ventana de recepción (src/preload/reception.ts)
    receptionApi: ReceptionApi
  }
}

export {}
