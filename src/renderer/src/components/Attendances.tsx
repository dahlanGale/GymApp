import { useState } from 'react'
import { AppData, Attendance } from '../types'
import { Table, StatCard, Card, Button, Input, Badge } from './UI'
import { ColumnDef } from '@tanstack/react-table'
import { toLocalDateString } from '../utils/dates'

interface AttendancesProps {
  data: AppData
}

export function Attendances({ data }: AttendancesProps) {
  const today = toLocalDateString()
  const [selectedDate, setSelectedDate] = useState(today)

  const dayAttendances = data.attendances
    .filter(a => toLocalDateString(new Date(a.timestamp)) === selectedDate)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const uniqueMembers = new Set(dayAttendances.map(a => a.memberId)).size

  const attendanceColumns: ColumnDef<Attendance>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Hora',
      cell: info => new Date(info.getValue() as string).toLocaleTimeString(),
    },
    { accessorKey: 'memberName', header: 'Miembro' },
    {
      id: 'expiredOverride',
      header: 'Nota',
      enableGlobalFilter: false,
      cell: info => info.row.original.expiredOverride ? <Badge variant="warning">Entró vencido</Badge> : null,
    },
  ]

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Asistencias</h2>
      </header>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Asistencias del Día" value={dayAttendances.length} variant="primary" />
          <StatCard title="Miembros Distintos" value={uniqueMembers} variant="accent" />
          <StatCard title="Total Histórico" value={data.attendances.length} />
        </div>
        <div className="flex items-end gap-4 mb-6">
          <div className="w-56">
            <Input
              label="Fecha"
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value || today)}
            />
          </div>
          {selectedDate !== today && (
            <Button variant="secondary" onClick={() => setSelectedDate(today)}>
              Hoy
            </Button>
          )}
        </div>
        <Card>
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Registro de Entradas</h3>
          <Table data={dayAttendances} columns={attendanceColumns} searchPlaceholder="Buscar miembro..." />
        </Card>
      </div>
    </>
  )
}
