import { useState } from 'react'
import { AppData, MembershipSale, Sale } from '../types'
import { Table, StatCard, Card, Button, Input } from './UI'
import { ColumnDef } from '@tanstack/react-table'
import { toLocalDateString } from '../utils/dates'

interface SalesHistoryProps {
  data: AppData
}

const formatMoney = (value: number) => `$${value.toFixed(2)}`
const formatPaymentMethod = (method: 'cash' | 'card') => (method === 'cash' ? 'Efectivo' : 'Tarjeta')

export function SalesHistory({ data }: SalesHistoryProps) {
  const today = toLocalDateString()
  const [selectedDate, setSelectedDate] = useState(today)

  const daySales = data.sales
    .filter(s => toLocalDateString(new Date(s.date)) === selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  // purchaseDate ya es una fecha local 'YYYY-MM-DD'
  const dayMembershipSales = data.membershipSales.filter(s => s.purchaseDate === selectedDate)

  const productsTotal = daySales.reduce((sum, s) => sum + s.total, 0)
  const membershipsTotal = dayMembershipSales.reduce((sum, s) => sum + s.price, 0)
  const cashTotal =
    daySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0) +
    dayMembershipSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.price, 0)
  const dayTotal = productsTotal + membershipsTotal

  const salesColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'date',
      header: 'Hora',
      cell: info => new Date(info.getValue() as string).toLocaleTimeString(),
    },
    {
      accessorKey: 'memberName',
      header: 'Cliente',
      cell: info => (info.getValue() as string | null) || 'Cliente General',
    },
    {
      id: 'items',
      accessorFn: sale => sale.items.map(item => `${item.quantity}× ${item.productName}`).join(', '),
      header: 'Productos',
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Método',
      cell: info => formatPaymentMethod(info.getValue() as Sale['paymentMethod']),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: info => formatMoney(info.getValue() as number),
    },
  ]

  const membershipSalesColumns: ColumnDef<MembershipSale>[] = [
    { accessorKey: 'membershipName', header: 'Membresía' },
    {
      id: 'members',
      accessorFn: sale => sale.memberNames.join(', '),
      header: 'Miembros',
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Método',
      cell: info => formatPaymentMethod(info.getValue() as MembershipSale['paymentMethod']),
    },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: info => formatMoney(info.getValue() as number),
    },
  ]

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Historial de Ventas</h2>
      </header>
      <div className="p-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total del Día" value={formatMoney(dayTotal)} variant="primary" />
          <StatCard title="Productos" value={formatMoney(productsTotal)} />
          <StatCard title="Membresías" value={formatMoney(membershipsTotal)} />
          <StatCard title="En Efectivo" value={formatMoney(cashTotal)} variant="accent" />
        </div>
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">
              Ventas de Productos ({daySales.length})
            </h3>
            <Table data={daySales} columns={salesColumns} searchPlaceholder="Buscar venta..." />
          </Card>
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">
              Ventas de Membresías ({dayMembershipSales.length})
            </h3>
            <Table data={dayMembershipSales} columns={membershipSalesColumns} searchPlaceholder="Buscar membresía..." />
          </Card>
        </div>
      </div>
    </>
  )
}
