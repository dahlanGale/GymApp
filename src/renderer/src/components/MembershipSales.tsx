import { useState } from 'react'
import { AppData, MembershipSale } from '../types'
import { Table, Button, Modal, Input, Badge, Card, StatCard, Select } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface MembershipSalesProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function MembershipSales({ data, updateData }: MembershipSalesProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedMembership, setSelectedMembership] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [showNewMember, setShowNewMember] = useState(false)

  const recentSales = [...data.membershipSales].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))

  const getStatusColor = (expirationDate: string) => {
    const today = new Date()
    const exp = new Date(expirationDate)
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'danger'
    if (diffDays <= 7) return 'warning'
    return 'success'
  }

  const getStatusLabel = (expirationDate: string) => {
    if (new Date(expirationDate) < new Date()) return 'Vencida'
    if (Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 7) return 'Por Vencer'
    return 'Activa'
  }

  const salesColumns: ColumnDef<MembershipSale>[] = [
    { accessorKey: 'purchaseDate', header: 'Fecha Compra' },
    { accessorKey: 'membershipName', header: 'Membresía' },
    {
      accessorKey: 'memberNames',
      header: 'Miembros',
      cell: info => (info.getValue() as string[]).join(', '),
    },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: info => `$${(info.getValue() as number).toFixed(2)}`,
    },
    { accessorKey: 'expirationDate', header: 'Vencimiento' },
    {
      accessorKey: 'expirationDate',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={getStatusColor(row.original.expirationDate)}>
          {getStatusLabel(row.original.expirationDate)}
        </Badge>
      ),
    },
  ]

  const toggleMemberSelection = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId))
    } else {
      setSelectedMembers([...selectedMembers, memberId])
    }
  }

  const handleSubmit = async () => {
    if (!selectedMembership || selectedMembers.length === 0) return

    const membership = data.memberships.find(m => m.id === selectedMembership)
    if (!membership) return

    const purchaseDate = new Date().toISOString().split('T')[0]
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + membership.durationDays)

    const memberNames = selectedMembers.map(id => {
      const member = data.members.find(m => m.id === id)
      return member?.name || 'Unknown'
    })

    const finalPrice = membership.hasPromotion 
      ? Math.max(0, membership.price - membership.promotionDiscount)
      : membership.price

    await window.api.addMembershipSale({
      membershipId: selectedMembership,
      membershipName: membership.name + (membership.hasPromotion ? ` (${membership.promotionType === 'new_client' ? 'Cliente Nuevo' : membership.promotionType === 'couple' ? 'Pareja' : 'Sin Mantenimiento'})` : ''),
      memberIds: selectedMembers,
      memberNames,
      purchaseDate,
      expirationDate: expirationDate.toISOString().split('T')[0],
      price: finalPrice,
      paymentMethod
    })

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setSelectedMembers([])
    setSelectedMembership('')
    setForm({ name: '', phone: '', email: '' })
    setShowNewMember(false)
  }

  const handleAddNewMember = async () => {
    if (!form.name) return
    const newMember = await window.api.addMember({
      name: form.name,
      phone: form.phone,
      email: form.email,
      membershipId: '',
      startDate: '',
      endDate: '',
      status: 'active'
    })
    setSelectedMembers([...selectedMembers, newMember.id])
    setForm({ name: '', phone: '', email: '' })
    setShowNewMember(false)
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Venta de Membresías</h2>
      </header>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard title="Total Ventas de Membresías" value={data.membershipSales.length} />
          <StatCard title="Ingresos por Membresías" value={`$${data.membershipSales.reduce((sum, s) => sum + s.price, 0).toFixed(2)}`} variant="primary" />
        </div>
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowModal(true)}>
            + Nueva Venta
          </Button>
        </div>
        <Card>
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Historial de Membresías Vendidas</h3>
          <Table data={recentSales} columns={salesColumns} searchPlaceholder="Buscar venta..." />
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Vender Membresía" size="xl">
        <div className="space-y-4">
          <Select
            label="Tipo de Membresía"
            value={selectedMembership}
            onChange={e => setSelectedMembership(e.target.value)}
            options={[{ value: '', label: 'Seleccionar...' }, ...data.memberships.map(m => ({ value: m.id, label: `${m.name} - $${m.price} (${m.durationDays} días)` }))]}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Miembros ({selectedMembers.length} seleccionados)</label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {data.members.length === 0 ? (
                <div className="text-gray-500 p-2">No hay miembros registrados</div>
              ) : (
                data.members.map(member => (
                  <label key={member.id} className="flex items-center gap-2 p-1.5 cursor-pointer border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMemberSelection(member.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{member.name} {member.status === 'active' ? '(Activo)' : ''}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShowNewMember(true)}>
            + Crear Nuevo Miembro
          </Button>

          {showNewMember && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <Input
                label="Nombre"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Teléfono"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <Button size="sm" onClick={handleAddNewMember}>Agregar Miembro</Button>
            </div>
          )}

          {selectedMembership && selectedMembers.length > 0 && (() => {
            const membership = data.memberships.find(m => m.id === selectedMembership)
            if (!membership) return null
            const finalPrice = membership.hasPromotion 
              ? Math.max(0, membership.price - membership.promotionDiscount)
              : membership.price
            return (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Membresía:</span>
                  <span className="text-gray-800">{membership.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Miembros:</span>
                  <span className="text-gray-800">{selectedMembers.length}</span>
                </div>
                {membership.hasPromotion && (
                  <div className="flex justify-between mb-1 text-blue-600">
                    <span>Promoción:</span>
                    <span>{membership.promotionType === 'new_client' ? 'Cliente Nuevo' : membership.promotionType === 'couple' ? 'Pareja' : 'Sin Mantenimiento'}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold mt-2">
                  <span>Total:</span>
                  <span>
                    {membership.hasPromotion ? (
                      <>
                        <span className="line-through text-sm text-gray-400 mr-2">
                          ${membership.price.toFixed(2)}
                        </span>
                        <span className="text-blue-600">${finalPrice.toFixed(2)}</span>
                      </>
                    ) : (
                      `$${membership.price.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
            )
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Efectivo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Tarjeta</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button 
            variant="success"
            onClick={handleSubmit}
            disabled={!selectedMembership || selectedMembers.length === 0}
          >
            Vender Membresía
          </Button>
        </div>
      </Modal>
    </>
  )
}
