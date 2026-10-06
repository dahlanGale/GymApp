import { useEffect, useState } from 'react'
import { Button, Card, Input } from './UI'

interface SecuritySettingsProps {
  // Se llama cuando cambia si hay contraseña, para mostrar u ocultar el botón Bloquear
  onChanged: (hasPassword: boolean) => void
}

// La contraseña nunca se muestra ni se puede consultar: solo se guarda su hash en el proceso main
export function SecuritySettings({ onChanged }: SecuritySettingsProps) {
  const [hasPassword, setHasPassword] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmNext, setConfirmNext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.getSecurityStatus()
      .then(status => setHasPassword(status.hasPassword))
      .catch((err: unknown) => console.error('Error loading security status:', err))
  }, [])

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirmNext('')
    setError(null)
  }

  const handleSave = async () => {
    if (next !== confirmNext) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setSaving(true)
    try {
      const result = await window.api.setPassword(current, next)
      if (!result.ok) {
        setError(result.error)
        return
      }
      reset()
      setHasPassword(true)
      onChanged(true)
      alert(hasPassword ? 'Contraseña cambiada.' : 'Contraseña creada. La próxima vez que abras GymPOS te la pedirá.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('¿Quitar la contraseña? Cualquiera frente a la computadora podrá usar GymPOS.')) return
    setSaving(true)
    try {
      const result = await window.api.removePassword(current)
      if (!result.ok) {
        setError(result.error)
        return
      }
      reset()
      setHasPassword(false)
      onChanged(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-800 mb-1">Contraseña</h3>
      <p className="text-sm text-gray-500 mb-4">
        {hasPassword
          ? 'GymPOS pide la contraseña al abrirse y al pulsar Bloquear. Se guarda cifrada y no se puede consultar.'
          : 'Protege la ventana principal con una contraseña. El kiosco de Check-In y la Recepción no la piden.'}
      </p>
      <div className="space-y-3">
        {hasPassword && (
          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={e => { setCurrent(e.target.value); setError(null) }}
          />
        )}
        <Input
          label={hasPassword ? 'Contraseña nueva' : 'Contraseña'}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={e => { setNext(e.target.value); setError(null) }}
        />
        <Input
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmNext}
          onChange={e => { setConfirmNext(e.target.value); setError(null) }}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between gap-3">
          <div>
            {hasPassword && (
              <Button variant="danger" onClick={handleRemove} disabled={!current || saving}>Quitar contraseña</Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={!next || !confirmNext || (hasPassword && !current) || saving}>
            {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </Button>
        </div>
        {hasPassword && (
          <p className="text-xs text-gray-400">
            Si la olvidas, se quita borrando el archivo gym-pos-security.json de la carpeta de datos de GymPOS (ver README).
          </p>
        )}
      </div>
    </Card>
  )
}
