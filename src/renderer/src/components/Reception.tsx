import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckInResult, ReceptionMember, ReceptionState } from '../types'
import { Badge, Button } from './UI'
import { CHECK_IN_FEEDBACK_COLORS, CheckInFeedbackType, getFeedbackFromResult } from '../utils/checkInFeedback'
import { MEMBER_STATUS_DISPLAY } from '../utils/memberStatus'
import { formatTime } from '../utils/format'
import { toLocalDateString } from '../utils/dates'
import { normalizeNfcTag, normalizeText } from '../../../shared/text'

// Con muchos miembros, la lista sin filtro se recorta para que la ventana siga siendo ágil
const MAX_VISIBLE_MEMBERS = 100
const FEEDBACK_DURATION_MS = 3000
// Cada minuto se revisa si cambió el día, para no seguir mostrando las entradas de ayer
const DAY_CHECK_INTERVAL_MS = 60 * 1000

// Lo que escriben el lector NFC o el escáner: solo dígitos o hexadecimal, de 6 o más caracteres.
// Nunca se toma como búsqueda por nombre, para no registrar a otra persona si la tarjeta no está vinculada.
function looksLikeScan(value: string): boolean {
  return /^[0-9A-F]{6,}$/.test(normalizeNfcTag(value))
}

export function Reception() {
  const [state, setState] = useState<ReceptionState>({ members: [], todayAttendances: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [today, setToday] = useState(toLocalDateString())
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{ type: CheckInFeedbackType; message: string } | null>(null)
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
  // Miembro con la membresía vencida que el personal puede dejar pasar. Se confirma con botones y no con
  // confirm(), porque el Enter que manda el lector NFC aceptaría el diálogo solo
  const [overridePrompt, setOverridePrompt] = useState<{ memberId: string; memberName: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await window.receptionApi.getState())
      setLoadError(false)
    } catch (error: unknown) {
      console.error('Error loading reception data:', error)
      setLoadError(true)
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

  // Si la ventana queda abierta toda la noche, al cambiar el día se recargan las entradas y los estados
  useEffect(() => {
    const interval = setInterval(() => {
      const now = toLocalDateString()
      if (now !== today) {
        setToday(now)
        refresh()
      }
    }, DAY_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [today, refresh])

  // Hora de la última entrada de hoy por miembro (todayAttendances viene de la más reciente a la más antigua)
  const lastEntryByMember = useMemo(() => {
    const entries = new Map<string, string>()
    for (const attendance of state.todayAttendances) {
      if (!entries.has(attendance.memberId)) entries.set(attendance.memberId, attendance.timestamp)
    }
    return entries
  }, [state.todayAttendances])

  const filteredMembers = useMemo(() => {
    const query = normalizeText(search)
    if (!query) return state.members
    const digits = query.replace(/\D/g, '')
    const matches = state.members.filter(member =>
      normalizeText(member.name).includes(query) ||
      member.code.toLowerCase().includes(query) ||
      (digits.length > 0 && member.phone.replace(/\D/g, '').includes(digits))
    )
    // Un código exacto va primero
    const exact = matches.find(member => member.code.toLowerCase() === query)
    return exact ? [exact, ...matches.filter(member => member !== exact)] : matches
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

  const showResult = (result: CheckInResult) => {
    if (result.status === 'expired') {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      setFeedback(null)
      setOverridePrompt({ memberId: result.memberId, memberName: result.memberName })
      return
    }
    setOverridePrompt(null)
    const { type, message } = getFeedbackFromResult(result)
    showFeedback(type, message)
  }

  const handleOverride = async () => {
    if (!overridePrompt || pendingMemberId) return
    const { memberId } = overridePrompt
    setPendingMemberId(memberId)
    try {
      const result = await window.receptionApi.checkInOverride(memberId)
      showResult(result)
    } catch (error: unknown) {
      console.error('Error during reception override check-in:', error)
      showFeedback('error', 'Error al registrar entrada')
    } finally {
      setPendingMemberId(null)
      searchRef.current?.focus()
    }
  }

  const overrideMember = overridePrompt ? state.members.find(m => m.id === overridePrompt.memberId) : undefined

  // Enter: el proceso main busca igual que el kiosco (código, tarjeta NFC, credencial, teléfono o email).
  // Si no encuentra a nadie y la búsqueda por nombre deja un solo miembro, se registra a ese.
  const handleEnter = async (raw: string) => {
    const scanned = looksLikeScan(raw)
    const fallback = !scanned && filteredMembers.length === 1 ? filteredMembers[0] : null
    // Una lectura se borra de inmediato, para que la siguiente tarjeta empiece con el campo vacío
    if (scanned) setSearch(current => (current === raw ? '' : current))
    try {
      let result = await window.receptionApi.checkInByCode(raw)
      if (result.status === 'not_found' && fallback) result = await window.receptionApi.checkIn(fallback.id)
      showResult(result)
      if (result.status === 'success') setSearch(current => (current === raw ? '' : current))
    } catch (error: unknown) {
      console.error('Error during reception check-in:', error)
      showFeedback('error', 'Error al registrar entrada')
    } finally {
      searchRef.current?.focus()
    }
  }

  const handleCheckIn = async (member: ReceptionMember) => {
    if (pendingMemberId) return
    setPendingMemberId(member.id)
    const searchAtClick = search
    try {
      // La lista se actualiza sola con el aviso data-changed que manda el proceso main al guardar
      const result = await window.receptionApi.checkIn(member.id)
      showResult(result)
      // Solo se limpia si nadie escribió otra búsqueda mientras se registraba
      if (result.status === 'success') setSearch(current => (current === searchAtClick ? '' : current))
    } catch (error: unknown) {
      console.error('Error during reception check-in:', error)
      showFeedback('error', 'Error al registrar entrada')
    } finally {
      setPendingMemberId(null)
      searchRef.current?.focus()
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (search.trim()) handleEnter(search)
    } else if (e.key === 'Escape') {
      setSearch('')
    }
  }

  const [year, month, day] = today.split('-').map(Number)
  const todayLabel = new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

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

      {overridePrompt && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-lg border-2 bg-yellow-100 border-yellow-500 text-yellow-900 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold">{overridePrompt.memberName} tiene la membresía vencida</div>
            <div className="text-sm">
              {overrideMember?.endDate ? `Venció el ${overrideMember.endDate}. ` : ''}
              Puedes dejarlo pasar hoy; la entrada queda marcada como vencida en Asistencias.
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setOverridePrompt(null)}>Cancelar</Button>
          <Button size="sm" variant="primary" disabled={pendingMemberId !== null} onClick={handleOverride}>
            {pendingMemberId === overridePrompt.memberId ? 'Registrando…' : 'Dejar pasar'}
          </Button>
        </div>
      )}

      {feedback && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-lg border-2 text-center font-semibold ${CHECK_IN_FEEDBACK_COLORS[feedback.type]}`}>
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
              placeholder="Buscar por nombre, código o teléfono, o acercar la tarjeta NFC…"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500">
              Pulsa “Registrar entrada”, o Enter con el código exacto o cuando la búsqueda deje un solo miembro. Con el cursor aquí, acercar una tarjeta NFC registra la entrada.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-gray-500">Cargando…</p>
            ) : loadError ? (
              <div className="p-6 text-center">
                <p className="text-red-700 font-medium">No se pudieron cargar los miembros.</p>
                <p className="text-sm text-gray-500 mt-1">Revisa los datos importados recientemente.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => refresh()}>
                  Reintentar
                </Button>
              </div>
            ) : visibleMembers.length === 0 ? (
              <p className="p-6 text-center text-gray-500">
                {state.members.length === 0 ? 'No hay miembros registrados.' : 'Ningún miembro coincide con la búsqueda.'}
              </p>
            ) : (
              <ul>
                {visibleMembers.map(member => {
                  const status = MEMBER_STATUS_DISPLAY[member.status]
                  const lastEntry = lastEntryByMember.get(member.id)
                  // Con la membresía vencida el botón abre el aviso para dejarlo pasar; congelado no puede entrar
                  const canCheckIn = member.status === 'active' || member.status === 'expired'
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
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {lastEntry && <span className="text-xs font-medium text-green-700">✓ Entró {formatTime(lastEntry)}</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!canCheckIn || pendingMemberId !== null}
                        title={canCheckIn ? undefined : `No puede entrar: membresía ${status.membershipLabel}`}
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
                    {attendance.expiredOverride && <Badge variant="warning">Vencido</Badge>}
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
