import { useState } from 'react'
import { AppData, Membership } from '../types'
import { Table, Button, Modal, Input, Badge, Select } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface MembershipsProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Memberships({ data, updateData }: MembershipsProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [form, setForm] = useState({
    name: '',
    price: 0,
    durationDays: 30,
    hasPromotion: false,
    promotionType: null as 'new_client' | 'couple' | 'no_maintenance' | null,
    promotionDiscount: 0,
    includesAnnualMaintenance: false
  })

  const handleSubmit = async () => {
    if (!form.name || form.price <= 0 || form.durationDays <= 0) return

    const membershipData = {
      ...form,
      promotionType: form.hasPromotion ? form.promotionType : null
    }

    if (editingMembership) {
      await window.api.updateMembership(editingMembership.id, membershipData)
    } else {
      await window.api.addMembership(membershipData)
    }

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setEditingMembership(null)
    setForm({ name: '', price: 0, durationDays: 30, hasPromotion: false, promotionType: null, promotionDiscount: 0, includesAnnualMaintenance: false })
  }

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership)
    setForm({
      name: membership.name,
      price: membership.price,
      durationDays: membership.durationDays,
      hasPromotion: membership.hasPromotion,
      promotionType: membership.promotionType,
      promotionDiscount: membership.promotionDiscount,
      includesAnnualMaintenance: membership.includesAnnualMaintenance
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta membresía?')) {
      await window.api.deleteMembership(id)
      const newData = await window.api.getData()
      updateData(newData)
    }
  }

  const getPromotionLabel = (type: string | null) => {
    switch (type) {
      case 'new_client': return 'Cliente Nuevo'
      case 'couple': return 'Pareja'
      case 'no_maintenance': return 'Sin Mantenimiento'
      default: return ''
    }
  }

  const membershipsColumns: ColumnDef<Membership>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: info => `$${(info.getValue() as number).toFixed(2)}`,
    },
    {
      accessorKey: 'durationDays',
      header: 'Duración',
      cell: info => `${info.getValue()} días`,
    },
    {
      accessorKey: 'hasPromotion',
      header: 'Promoción',
      cell: ({ row }) => {
        const m = row.original
        if (!m.hasPromotion) return <span className="text-gray-400">-</span>
        return (
          <Badge variant="success">
            {getPromotionLabel(m.promotionType)} (-${m.promotionDiscount})
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row.original)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Eliminar</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Membresías</h2>
      </header>
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowModal(true)}>
            + Nueva Membresía
          </Button>
        </div>
        <Table data={data.memberships} columns={membershipsColumns} searchPlaceholder="Buscar membresía..." />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingMembership ? 'Editar Membresía' : 'Nueva Membresía'} size="lg">
        <div className="space-y-4">
          <Input
            label="Nombre"
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio"
              type="number"
              step="0.01"
              value={form.price}
              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
            />
            <Input
              label="Duración (días)"
              type="number"
              value={form.durationDays}
              onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) })}
            />
          </div>

          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.includesAnnualMaintenance}
                onChange={e => setForm({ ...form, includesAnnualMaintenance: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Incluye Mantenimiento Anual</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              El precio del mantenimiento se agregará al vender la membresía
            </p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasPromotion}
                onChange={e => setForm({ ...form, hasPromotion: e.target.checked, promotionType: e.target.checked ? form.promotionType : null, promotionDiscount: e.target.checked ? form.promotionDiscount : 0 })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Esta membresía tiene promoción</span>
            </label>
          </div>

          {form.hasPromotion && (
            <>
              <Select
                label="Tipo de Promoción"
                value={form.promotionType || ''}
                onChange={e => setForm({ ...form, promotionType: e.target.value as 'new_client' | 'couple' | 'no_maintenance' })}
                options={[
                  { value: '', label: 'Seleccionar...' },
                  { value: 'new_client', label: 'Cliente Nuevo' },
                  { value: 'couple', label: 'Pareja (2 personas)' },
                  { value: 'no_maintenance', label: 'Sin Mantenimiento Anual' },
                ]}
              />
              <Input
                label="Descuento ($)"
                type="number"
                step="0.01"
                value={form.promotionDiscount}
                onChange={e => setForm({ ...form, promotionDiscount: parseFloat(e.target.value) })}
                placeholder="Monto de descuento"
              />
              {form.promotionType && form.price > 0 && (
                <div className="p-3 bg-green-100 rounded-lg mt-2">
                  <div className="text-xs text-green-800 mb-1">Precio final con promoción:</div>
                  <div className="text-2xl font-bold text-green-800">
                    ${Math.max(0, form.price - form.promotionDiscount).toFixed(2)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </div>
      </Modal>
    </>
  )
}
