import { useState } from 'react'
import { AppData } from '../types'
import { Table, StatCard, Card } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface DashboardProps {
  data: AppData
}

export function Dashboard({ data }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0]
  const todaySales = data.sales.filter(s => s.date.startsWith(today))
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const activeMembers = data.members.filter(m => m.status === 'active').length

  const recentSales = [...data.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  const salesColumns: ColumnDef<typeof recentSales[0]>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: info => new Date(info.getValue() as string).toLocaleString(),
    },
    {
      accessorKey: 'memberName',
      header: 'Cliente',
      cell: info => info.getValue() || 'Cliente General',
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: info => `$${(info.getValue() as number).toFixed(2)}`,
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Método',
      cell: info => (info.getValue() === 'cash' ? 'Efectivo' : 'Tarjeta'),
    },
  ]

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const expirationsInMonth = data.members
    .filter(m => {
      const expDate = new Date(m.endDate)
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate))

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <>
      <header className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
      </header>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Ventas Hoy" value={`$${todayRevenue.toFixed(2)}`} />
          <StatCard title="Transacciones Hoy" value={todaySales.length} variant="accent" />
          <StatCard title="Miembros Activos" value={activeMembers} variant="primary" />
          <StatCard title="Total Miembros" value={data.members.length} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Ventas Recientes</h3>
            <Table data={recentSales} columns={salesColumns} searchPlaceholder="Buscar venta..." />
          </Card>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Calendario de Vencimientos</h3>
              <div className="flex gap-2 items-center">
                <button className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-200 transition-colors cursor-pointer" onClick={prevMonth}>◀</button>
                <span className="min-w-[120px] text-center text-slate-700">{monthNames[currentMonth]} {currentYear}</span>
                <button className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-200 transition-colors cursor-pointer" onClick={nextMonth}>▶</button>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const expiring = expirationsInMonth.filter(m => m.endDate === dateStr)
                  const isToday = dateStr === today
                  return (
                    <div
                      key={day}
                      className={`h-8 flex items-center justify-center rounded text-xs relative ${
                        expiring.length > 0 
                          ? (isToday ? 'bg-red-500 text-white' : 'bg-amber-500 text-white')
                          : isToday 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-800'
                      } ${expiring.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                      title={expiring.length > 0 ? expiring.map(m => `${m.name} - ${m.endDate}`).join('\n') : ''}
                    >
                      {day}
                      {expiring.length > 1 && <span className="absolute top-0.5 right-0.5 text-[8px]">●</span>}
                    </div>
                  )
                })}
              </div>
            </div>
            {expirationsInMonth.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <h4 className="text-xs font-semibold mb-2 text-slate-500">Vencimientos este mes:</h4>
                {expirationsInMonth.map(m => (
                  <div key={m.id} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-b-0">
                    <span className="text-slate-700">{m.name}</span>
                    <span className={m.endDate === today ? 'text-red-500' : 'text-slate-500'}>{m.endDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
