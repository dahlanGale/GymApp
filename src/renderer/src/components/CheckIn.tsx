import { useState, useEffect, useRef } from 'react'
import { Member } from '../types'

type FeedbackType = 'success' | 'error' | 'warning' | null

interface CheckInProps {
  standalone?: boolean
}

export function CheckIn({ standalone = false }: CheckInProps) {
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const clearFeedback = () => {
    setTimeout(() => {
      setFeedback(null)
      setMessage('')
      setCode('')
      inputRef.current?.focus()
    }, 2000)
  }

  const handleCheckIn = async () => {
    if (!code.trim()) {
      setFeedback('error')
      setMessage('Por favor ingresa un código')
      clearFeedback()
      return
    }

    setLoading(true)

    try {
      const member = await window.api.searchMemberByCode(code.trim())

      if (!member) {
        setFeedback('error')
        setMessage('Miembro no encontrado')
        clearFeedback()
        setLoading(false)
        return
      }

      const today = new Date()
      const endDate = new Date(member.endDate)
      const isExpired = endDate < today

      if (isExpired) {
        setFeedback('warning')
        setMessage(`${member.name} - Membresía Expirada`)
        await window.api.recordAttendance(member.id)
        clearFeedback()
        setLoading(false)
        return
      }

      if (member.status === 'frozen') {
        setFeedback('warning')
        setMessage(`${member.name} - Membresía Congelada`)
        clearFeedback()
        setLoading(false)
        return
      }

      await window.api.recordAttendance(member.id)
      setFeedback('success')
      setMessage(`¡Bienvenido ${member.name}!`)
      clearFeedback()
    } catch (error) {
      console.error('Error during check-in:', error)
      setFeedback('error')
      setMessage('Error al registrar entrada')
      clearFeedback()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCheckIn()
    }
  }

  const getFeedbackColor = () => {
    switch (feedback) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-800'
      case 'error':
        return 'bg-red-100 border-red-500 text-red-800'
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      default:
        return 'bg-gray-50 border-gray-300 text-gray-600'
    }
  }

  return (
    <div className={`${standalone ? 'min-h-screen' : ''} flex items-center justify-center bg-gray-50 p-8`}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Check-In</h1>
            <p className="text-gray-600">Escanea o ingresa tu código de miembro</p>
          </div>

          <div className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Código de miembro"
                disabled={loading}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                autoFocus
              />
            </div>

            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Registrar Entrada'}
            </button>
          </div>

          {feedback && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${getFeedbackColor()} transition-all`}>
              <p className="text-center text-lg font-semibold">{message}</p>
            </div>
          )}

          {!feedback && (
            <div className="mt-6 p-4 rounded-lg border-2 bg-gray-50 border-gray-300">
              <p className="text-center text-gray-500">Esperando escaneo...</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Presiona Enter después de escanear o escribir el código</p>
        </div>
      </div>
    </div>
  )
}
