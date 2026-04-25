import { useState } from 'react'
import { AppData, Entry } from '../types'
import { Table, StatCard, Card, Button, Modal, Input, Select } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface EntriesProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Entries({ data, updateData }: EntriesProps) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    unitCost: 0,
    supplier: ''
  })

  const recentEntries = [...data.entries].sort((a, b) => b.date.localeCompare(a.date))

  const entriesColumns: ColumnDef<Entry>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: info => new Date(info.getValue() as string).toLocaleString(),
    },
    { accessorKey: 'productName', header: 'Producto' },
    { accessorKey: 'quantity', header: 'Cantidad' },
    {
      accessorKey: 'unitCost',
      header: 'Costo Unitario',
      cell: info => `$${(info.getValue() as number).toFixed(2)}`,
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => `$${(row.original.quantity * row.original.unitCost).toFixed(2)}`,
    },
    {
      accessorKey: 'supplier',
      header: 'Proveedor',
      cell: info => info.getValue() || '-',
    },
  ]

  const handleSubmit = async () => {
    if (!form.productId || form.quantity <= 0 || form.unitCost <= 0) return

    const product = data.products.find(p => p.id === form.productId)
    if (!product) return

    await window.api.addEntry({
      productId: form.productId,
      productName: product.name,
      quantity: form.quantity,
      unitCost: form.unitCost,
      supplier: form.supplier,
      date: new Date().toISOString()
    })

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setForm({ productId: '', quantity: 1, unitCost: 0, supplier: '' })
  }

  const totalInvested = data.entries.reduce((sum, e) => sum + (e.quantity * e.unitCost), 0)

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Entradas de Inventario</h2>
      </header>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard title="Total Entradas" value={data.entries.length} />
          <StatCard title="Invertido Total" value={`$${totalInvested.toFixed(2)}`} variant="primary" />
        </div>
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowModal(true)}>
            + Registrar Entrada
          </Button>
        </div>
        <Card>
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Historial de Entradas</h3>
          <Table data={recentEntries} columns={entriesColumns} searchPlaceholder="Buscar entrada..." /></Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar Entrada">
        <div className="space-y-4">
          <Select
            label="Producto"
            value={form.productId}
            onChange={e => setForm({ ...form, productId: e.target.value })}
            options={[{ value: '', label: 'Seleccionar...' }, ...data.products.map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock})` }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })}
            />
            <Input
              label="Costo Unitario"
              type="number"
              step="0.01"
              value={form.unitCost}
              onChange={e => setForm({ ...form, unitCost: parseFloat(e.target.value) })}
            />
          </div>
          <Input
            label="Proveedor"
            type="text"
            value={form.supplier}
            onChange={e => setForm({ ...form, supplier: e.target.value })}
            placeholder="Nombre del proveedor (opcional)"
          />
          {form.productId && form.quantity > 0 && form.unitCost > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg mt-2">
              <strong>Total:</strong> ${(form.quantity * form.unitCost).toFixed(2)}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleSubmit}>Registrar Entrada</Button>
        </div>
      </Modal>
    </>
  )
}
