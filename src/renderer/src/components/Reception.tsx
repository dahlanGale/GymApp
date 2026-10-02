import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReceptionMember, ReceptionState } from '../types'
import { Badge, Button } from './UI'
import { CheckInFeedbackType, getFeedbackFromResult } from '../utils/checkInFeedback'

// Con muchos miembros, la lista sin filtro se recorta para que la ventana siga siendo ágil
const MAX_VISIBLE_MEMBERS = 100
const FEEDBACK_DURATION_MS = 3000

const STATUS_BADGES: Record<ReceptionMember['status'], { variant: 'success' | 'danger' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Activo' },
  expired: { variant: 'danger', label: 'Vencido' },
  frozen: { variant: 'warning', label: 'Congelado' },
}

const FEEDBACK_COLORS: Record<CheckInFeedbackType, string> = {
  success: 'bg-green-100 border-green-500 text-green-800',
  warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  error: 'bg-red-100 border-red-500 text-red-800',
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Reception() {
  const [state, setState] = useState<ReceptionState>({ members: [], todayAttendances: [] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{ type: CheckInFeedbackType; message: string } | null>(null)
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await window.receptionApi.getState())
    } catch (error: unknown) {
      console.error('Error loading reception data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    searchRef.current?.focus()
    // Se actualiza con cada cambio de datos: check-ins del kiosco, miembros nuevos, ventas de membresía…
    const unsubscribe = window.receptionApi.onDataChanged(() => {
      refresh()
    })
    window.addEventListener('focus', refresh)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', refresh)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [refresh])

  // Hora de la última entrada de hoy por miembro (todayAttendances viene de la más reciente a la más antigua)
  const lastEntryByMember = useMemo(() => {
    const entries = new Map<string, string>()
    for (const attendance of state.todayAttendances) {
      if (!entries.has(attendance.memberId)) entries.set(attendance.memberId, attendance.timestamp)
    }
    return entries
  }, [state.todayAttendances])

  const filteredMembers = useMemo(() => {
    const query = normalizeSearch(search)
    if (!query) return state.members
    const digits = query.replace(/\D/g, '')
    return state.members.filter(member =>
      normalizeSearch(member.name).includes(query) ||
      member.code.toLowerCase().includes(query) ||
      (digits.length > 0 && member.phone.replace(/\D/g, '').includes(digits))
    )
  }, [state.members, search])

  const visibleMembers = filteredMembers.slice(0, MAX_VISIBLE_MEMBERS)

  const showFeedback = (type: CheckInFeedbackType, message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setFeedback({ type, message })
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, FEEDBACK_DURATION_MS)
  }

  const handleCheckIn = async (member: ReceptionMember) => {
    if (pendingMemberId) return
    setPendingMemberId(member.id)
    try {
      const result = await window.receptionApi.checkIn(member.id)
      const { type, message } = getFeedbackFromResult(result)
      showFeedback(type, message)
      if (result.status === 'success') setSearch('')
      await refresh()
    } catch (error: unknown) {
      console.error('Error during reception check-in:', error)
      showFeedback('error', 'Error al registrar entrada')
    } finally {
      setPendingMemberId(null)
      searchRef.current?.focus()
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter registra directamente cuando la búsqueda deja un solo miembro
    if (e.key === 'Enter' && filteredMembers.length === 1) {
      e.preventDefault()
      handleCheckIn(filteredMembers[0])
    } else if (e.key === 'Escape') {
      setSearch('')
    }
  }

  const todayLabel = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Recepción</h1>
          <p className="text-sm text-gray-500 capitalize">{todayLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-500 uppercase">Entradas hoy</div>
          <div className="text-3xl font-bold text-blue-600">{state.todayAttendances.length}</div>
        </div>
      </header>

      {feedback && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-lg border-2 text-center font-semibold ${FEEDBACK_COLORS[feedback.type]}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex-1 flex gap-4 p-4 min-h-0">
        <section className="flex-1 flex flex-col bg-white rounded-lg shadow-sm min-h-0">
          <div className="p-4 border-b border-gray-200">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, código o teléfono…"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500">
              Pulsa “Registrar entrada”, o Enter cuando la búsqueda deje un solo miembro.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-gray-500">Cargando…</p>
            ) : visibleMembers.length === 0 ? (
              <p className="p-6 text-center text-gray-500">
                {state.members.length === 0 ? 'No hay miembros registrados.' : 'Ningún miembro coincide con la búsqueda.'}
              </p>
            ) : (
              <ul>
                {visibleMembers.map(member => {
                  const badge = STATUS_BADGES[member.status]
                  const lastEntry = lastEntryByMember.get(member.id)
                  const canCheckIn = member.status === 'active'
                  return (
                    <li key={member.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-gray-900 truncate">{member.name}</span>
                          <span className="font-mono text-xs text-gray-500">{member.code}</span>
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {member.membershipName}
                          {member.endDate && ` · Vence ${member.endDate}`}
                          {member.phone && ` · ${member.phone}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {lastEntry && <span className="text-xs font-medium text-green-700">✓ Entró {formatTime(lastEntry)}</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!canCheckIn || pendingMemberId !== null}
                        title={canCheckIn ? undefined : `No puede entrar: membresía ${badge.label.toLowerCase()}`}
                        onClick={() => handleCheckIn(member)}
                      >
                        {pendingMemberId === member.id ? 'Registrando…' : 'Registrar entrada'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {filteredMembers.length > MAX_VISIBLE_MEMBERS && (
            <p className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
              Mostrando {MAX_VISIBLE_MEMBERS} de {filteredMembers.length}. Escribe para filtrar.
            </p>
          )}
        </section>

        <aside className="w-80 flex flex-col bg-white rounded-lg shadow-sm min-h-0">
          <h2 className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-800">
            Entradas de hoy ({state.todayAttendances.length})
          </h2>
          <div className="flex-1 overflow-y-auto">
            {state.todayAttendances.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Aún no hay entradas hoy.</p>
            ) : (
              <ul>
                {state.todayAttendances.map((attendance, index) => (
                  <li
                    key={attendance.id}
                    className={`flex items-center gap-3 px-4 py-2 border-b border-gray-100 ${index === 0 ? 'bg-green-50' : ''}`}
                  >
                    <span className="font-mono text-sm text-gray-500">{formatTime(attendance.timestamp)}</span>
                    <span className="text-sm text-gray-900 truncate">{attendance.memberName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
