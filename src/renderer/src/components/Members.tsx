import { useState } from 'react'
import { AppData, Member } from '../types'
import { Table, Button, Modal, Input, Select, Badge } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface MembersProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Members({ data, updateData }: MembersProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    membershipId: '',
    startDate: new Date().toISOString().split('T')[0]
  })

  const filteredMembers = data.members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  )

  const membersColumns: ColumnDef<Member>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'phone', header: 'Teléfono' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'membershipId',
      header: 'Membresía',
      cell: info => getMembershipName(info.getValue() as string),
    },
    { accessorKey: 'endDate', header: 'Expira' },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: info => {
        const status = info.getValue() as string
        const variant = status === 'active' ? 'success' : status === 'expired' ? 'danger' : 'warning'
        const label = status === 'active' ? 'Activo' : status === 'expired' ? 'Expirado' : 'Congelado'
        return <Badge variant={variant}>{label}</Badge>
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

  const getMembershipName = (id: string) => {
    const m = data.memberships.find(m => m.id === id)
    return m?.name || 'Sin membresía'
  }

  const getEndDate = (startDate: string, membershipId: string) => {
    const membership = data.memberships.find(m => m.id === membershipId)
    if (!membership) return ''
    const start = new Date(startDate)
    start.setDate(start.getDate() + membership.durationDays)
    return start.toISOString().split('T')[0]
  }

  const handleSubmit = async () => {
    if (!form.name || !form.membershipId) return

    const endDate = getEndDate(form.startDate, form.membershipId)

    if (editingMember) {
      await window.api.updateMember(editingMember.id, { ...form, endDate })
    } else {
      await window.api.addMember({ ...form, endDate, status: 'active' })
    }

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setEditingMember(null)
    setForm({ name: '', phone: '', email: '', membershipId: '', startDate: new Date().toISOString().split('T')[0] })
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setForm({
      name: member.name,
      phone: member.phone,
      email: member.email,
      membershipId: member.membershipId,
      startDate: member.startDate
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este miembro?')) {
      await window.api.deleteMember(id)
      const newData = await window.api.getData()
      updateData(newData)
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Miembros</h2>
      </header>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="w-full sm:w-72">
            <Input
              type="text"
              placeholder="Buscar miembro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowModal(true)}>
            + Nuevo Miembro
          </Button>
        </div>
        <Table data={filteredMembers} columns={membersColumns} searchPlaceholder="Buscar miembro..." />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingMember ? 'Editar Miembro' : 'Nuevo Miembro'}>
        <div className="space-y-4">
          <Input
            label="Nombre"
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Membresía"
              value={form.membershipId}
              onChange={e => setForm({ ...form, membershipId: e.target.value })}
              options={[{ value: '', label: 'Seleccionar...' }, ...data.memberships.map(m => ({ value: m.id, label: `${m.name} - $${m.price}` }))]}
            />
            <Input
              label="Fecha Inicio"
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </div>
      </Modal>
    </>
  )
}
