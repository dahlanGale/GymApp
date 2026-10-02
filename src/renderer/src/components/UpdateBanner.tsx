import { useEffect, useState } from 'react'
import { UpdateState } from '../types'
import { Button } from './UI'

// Aviso de versión nueva en la parte superior de la ventana principal
export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  // Se descarta por estado y versión: si se oculta la descarga, el aviso de "lista" vuelve a aparecer
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  useEffect(() => {
    window.api.getUpdateState()
      .then(setState)
      .catch((error: unknown) => console.error('Error loading update state:', error))
    return window.api.onUpdateState(setState)
  }, [])

  if (state.status === 'idle') return null
  const key = `${state.status}:${state.version}`
  if (dismissedKey === key) return null

  const dismiss = () => setDismissedKey(key)

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-900">
      <div className="flex-1">
        {state.status === 'available' && (
          <>Hay una nueva versión de GymPOS (<strong>v{state.version}</strong>). Descárgala e instálala para tener las mejoras.</>
        )}
        {state.status === 'downloading' && (
          <>Descargando la versión <strong>v{state.version}</strong>… {state.percent}%</>
        )}
        {state.status === 'downloaded' && (
          <>La versión <strong>v{state.version}</strong> está lista. Se instalará al cerrar la app, o ahora mismo con el botón.</>
        )}
      </div>
      {state.status === 'available' && (
        <Button size="sm" onClick={() => window.api.openUpdateDownload()}>Descargar</Button>
      )}
      {state.status === 'downloaded' && (
        <Button size="sm" onClick={() => window.api.installUpdate()}>Reiniciar y actualizar</Button>
      )}
      <Button size="sm" variant="secondary" onClick={dismiss}>Más tarde</Button>
    </div>
  )
}
