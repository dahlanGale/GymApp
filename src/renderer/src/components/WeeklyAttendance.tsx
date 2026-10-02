import { useMemo, useState } from 'react'
import { AppData, Attendance } from '../types'
import { Card } from './UI'
import { addDaysToDateString, toLocalDateString } from '../utils/dates'
import { formatTime } from '../utils/format'

interface WeeklyAttendanceProps {
  data: AppData
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface PersonRow {
  memberId: string
  name: string
  // Por día de la semana (0 = lunes): horas de entrada de ese día, en orden
  entriesByDay: string[][]
  daysAttended: number
}

// Lunes de la semana de la fecha dada (YYYY-MM-DD local)
function getWeekStart(date: Date): string {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return toLocalDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday))
}

function formatDayLabel(value: string): string {
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}

export function WeeklyAttendance({ data }: WeeklyAttendanceProps) {
  const today = toLocalDateString()
  const currentWeekStart = getWeekStart(new Date())
  const [weekStart, setWeekStart] = useState(currentWeekStart)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysToDateString(weekStart, index)),
    [weekStart]
  )

  const { rows, entriesPerDay, peoplePerDay, totalEntries } = useMemo(() => {
    const dayIndex = new Map(days.map((day, index) => [day, index]))
    const memberNames = new Map(data.members.map(m => [m.id, m.name]))
    const byMember = new Map<string, PersonRow>()
    const entriesPerDay = Array.from({ length: 7 }, () => 0)

    const weekAttendances = data.attendances
      .map(attendance => ({ attendance, index: dayIndex.get(toLocalDateString(new Date(attendance.timestamp))) }))
      .filter((item): item is { attendance: Attendance; index: number } => item.index !== undefined)
      .sort((a, b) => a.attendance.timestamp.localeCompare(b.attendance.timestamp))

    for (const { attendance, index } of weekAttendances) {
      let row = byMember.get(attendance.memberId)
      if (!row) {
        row = {
          memberId: attendance.memberId,
          // Nombre actual del miembro; si ya se eliminó, el que quedó guardado en la asistencia
          name: memberNames.get(attendance.memberId) ?? attendance.memberName,
          entriesByDay: Array.from({ length: 7 }, () => []),
          daysAttended: 0,
        }
        byMember.set(attendance.memberId, row)
      }
      if (row.entriesByDay[index].length === 0) row.daysAttended++
      row.entriesByDay[index].push(attendance.timestamp)
      entriesPerDay[index]++
    }

    const rows = [...byMember.values()].sort(
      (a, b) => b.daysAttended - a.daysAttended || a.name.localeCompare(b.name, 'es')
    )
    const peoplePerDay = days.map((_, index) => rows.filter(row => row.entriesByDay[index].length > 0).length)
    return { rows, entriesPerDay, peoplePerDay, totalEntries: weekAttendances.length }
  }, [data.attendances, data.members, days])

  const weekEnd = days[6]
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Asistencia Semanal</h3>
          <p className="text-sm text-slate-500">
            {formatDayLabel(weekStart)} – {formatDayLabel(weekEnd)} · {totalEntries} entradas · {rows.length} personas
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-200 transition-colors cursor-pointer"
            onClick={() => setWeekStart(addDaysToDateString(weekStart, -7))}
          >
            ◀
          </button>
          {!isCurrentWeek && (
            <button
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-200 transition-colors cursor-pointer"
              onClick={() => setWeekStart(currentWeekStart)}
            >
              Esta semana
            </button>
          )}
          <button
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setWeekStart(addDaysToDateString(weekStart, 7))}
            disabled={isCurrentWeek}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[28rem] border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Persona</th>
              {days.map((day, index) => (
                <th
                  key={day}
                  className={`px-3 py-2 text-center font-medium ${day === today ? 'text-blue-700 bg-blue-50' : 'text-slate-500'}`}
                >
                  <div>{DAY_NAMES[index]} {formatDayLabel(day)}</div>
                  <div className="text-xs font-normal">
                    {peoplePerDay[index]} {peoplePerDay[index] === 1 ? 'persona' : 'personas'}
                    {entriesPerDay[index] > peoplePerDay[index] && ` · ${entriesPerDay[index]} entradas`}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium text-slate-500">Días</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No hay asistencias registradas esta semana.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.memberId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-800 whitespace-nowrap">{row.name}</td>
                  {row.entriesByDay.map((entries, index) => (
                    <td key={days[index]} className={`px-3 py-2 text-center ${days[index] === today ? 'bg-blue-50/50' : ''}`}>
                      {entries.length > 0 && (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium"
                          title={entries.map(formatTime).join(', ')}
                        >
                          {formatTime(entries[0])}
                          {entries.length > 1 && ` +${entries.length - 1}`}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-slate-700">{row.daysAttended}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
