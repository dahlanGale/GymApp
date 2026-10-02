import { useEffect, useRef, useState } from 'react'
import { Member } from '../types'
import { Button, Modal } from './UI'

interface NfcTagModalProps {
  member: Member | null
  onClose: () => void
  // Se llama después de vincular o desvincular, para refrescar los datos
  onChanged: () => void
}

// Vincula la tarjeta NFC del miembro. Los lectores USB tipo teclado escriben el número de la tarjeta
// y presionan Enter solos, así que basta con acercarla con el cursor en el campo
export function NfcTagModal({ member, onClose, onChanged }: NfcTagModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const memberId = member?.id

  useEffect(() => {
    setValue('')
    setError(null)
    if (memberId) inputRef.current?.focus()
  }, [memberId])

  if (!member) return null

  const handleLink = async () => {
    if (!value.trim() || saving) return
    setSaving(true)
    try {
      const result = await window.api.linkNfcTag(member.id, value)
      if (!result.ok) {
        setError(result.error)
        setValue('')
        inputRef.current?.focus()
        return
      }
      onChanged()
      onClose()
    } catch (err: unknown) {
      console.error('Error linking NFC tag:', err)
      setError('No se pudo vincular la tarjeta.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async () => {
    if (!confirm(`¿Desvincular la tarjeta de ${member.name}? Ya no podrá entrar con ella.`)) return
    await window.api.unlinkNfcTag(member.id)
    onChanged()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLink()
    }
  }

  return (
    <Modal open onClose={onClose} title={`Tarjeta NFC de ${member.name}`}>
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-gray-50 text-sm">
          {member.nfcTag ? (
            <>Tarjeta vinculada: <span className="font-mono font-medium">{member.nfcTag}</span></>
          ) : (
            <span className="text-gray-500">Este miembro no tiene tarjeta vinculada.</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {member.nfcTag ? 'Acerca la tarjeta nueva al lector' : 'Acerca la tarjeta al lector'}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => {
              setValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Esperando tarjeta…"
            disabled={saving}
            className={`w-full px-3 py-2 font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
          {error ? (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              El lector escribe el número de la tarjeta solo. También puedes escribirlo y presionar Enter.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <div>
          {member.nfcTag && (
            <Button variant="danger" onClick={handleUnlink}>Desvincular</Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleLink} disabled={!value.trim() || saving}>
            {member.nfcTag ? 'Reemplazar tarjeta' : 'Vincular tarjeta'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
