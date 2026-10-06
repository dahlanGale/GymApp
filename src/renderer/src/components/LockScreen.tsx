import { useEffect, useRef, useState } from 'react'
import { Button } from './UI'

interface LockScreenProps {
  onUnlocked: () => void
}

// Pantalla que cubre la ventana principal mientras la app está bloqueada con contraseña
export function LockScreen({ onUnlocked }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!checking) inputRef.current?.focus()
  }, [checking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || checking) return
    setChecking(true)
    try {
      const ok = await window.api.unlock(password)
      if (ok) {
        onUnlocked()
        return
      }
      setError(true)
      setPassword('')
    } catch (err: unknown) {
      console.error('Error unlocking:', err)
      setError(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-xl p-8 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-600">GymPOS</h1>
          <p className="text-sm text-gray-500 mt-1">Escribe la contraseña para entrar</p>
        </div>
        <input
          ref={inputRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => {
            setPassword(e.target.value)
            setError(false)
          }}
          disabled={checking}
          placeholder="Contraseña"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        {error && <p className="text-sm text-red-600">Contraseña incorrecta.</p>}
        <Button type="submit" className="w-full" disabled={!password || checking}>
          {checking ? 'Revisando…' : 'Entrar'}
        </Button>
        <p className="text-xs text-gray-400 text-center">
          El kiosco de Check-In y la Recepción que ya estén abiertos siguen funcionando.
        </p>
      </form>
    </div>
  )
}
