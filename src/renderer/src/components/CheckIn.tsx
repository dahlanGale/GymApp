import { useState, useEffect, useRef } from 'react'
import { CHECK_IN_FEEDBACK_COLORS, CheckInFeedbackType, getFeedbackFromResult } from '../utils/checkInFeedback'

type FeedbackType = CheckInFeedbackType | null

interface CheckInProps {
  standalone?: boolean
}

const FEEDBACK_DURATION_MS = 2000

export function CheckIn({ standalone = false }: CheckInProps) {
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [message, setMessage] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRequestRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const showFeedback = (type: Exclude<FeedbackType, null>, text: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setFeedback(type)
    setMessage(text)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null)
      setMessage('')
      feedbackTimerRef.current = null
    }, FEEDBACK_DURATION_MS)
  }

  const handleCheckIn = async (fromButton: boolean) => {
    const trimmed = code.trim()
    setCode('')
    inputRef.current?.focus()

    if (!trimmed) {
      // Un Enter vacío (p. ej. CR/LF del escáner) se ignora para no pisar el mensaje anterior
      if (fromButton) showFeedback('error', 'Por favor ingresa un código')
      return
    }

    const requestId = ++latestRequestRef.current
    setPendingCount((count) => count + 1)

    try {
      const result = await window.checkInApi.checkIn(trimmed)
      if (requestId !== latestRequestRef.current) return
      const { type, message: text } = getFeedbackFromResult(result)
      showFeedback(type, text)
    } catch (error) {
      console.error('Error during check-in:', error)
      if (requestId === latestRequestRef.current) showFeedback('error', 'Error al registrar entrada')
    } finally {
      setPendingCount((count) => count - 1)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCheckIn(false)
    }
  }

  const loading = pendingCount > 0

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
                onKeyDown={handleKeyDown}
                placeholder="Código de miembro"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                autoFocus
              />
            </div>

            <button
              onClick={() => handleCheckIn(true)}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Registrar Entrada'}
            </button>
          </div>

          {feedback && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${CHECK_IN_FEEDBACK_COLORS[feedback]} transition-all`}>
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
