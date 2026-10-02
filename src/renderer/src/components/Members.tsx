import { useState } from 'react'
import { AppData, Member } from '../types'
import { Table, Button, Modal, Input, Select, Badge } from './UI'
import { ColumnDef } from '@tanstack/react-table'
import { MemberCredential } from './MemberCredential'
import { MemberHistory } from './MemberHistory'
import { toLocalDateString, addDaysToDateString, isValidDateString, getMemberStatus } from '../utils/dates'

interface MembersProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Members({ data, updateData }: MembersProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [credentialMember, setCredentialMember] = useState<Member | null>(null)
  // Se guarda el id para que el historial muestre siempre los datos actuales del miembro
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null)
  const historyMember = data.members.find(m => m.id === historyMemberId) ?? null
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    membershipId: '',
    startDate: toLocalDateString()
  })

  const membersColumns: ColumnDef<Member>[] = [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: info => <span className="font-mono">{info.getValue() as string}</span>,
    },
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
      id: 'status',
      accessorFn: member => getMemberStatus(member),
      header: 'Estado',
      cell: info => {
        const status = info.getValue() as Member['status']
        const variant = status === 'active' ? 'success' : status === 'expired' ? 'danger' : 'warning'
        const label = status === 'active' ? 'Activo' : status === 'expired' ? 'Expirado' : 'Congelado'
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const status = getMemberStatus(row.original)
        return (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setHistoryMemberId(row.original.id)}>Historial</Button>
          <Button size="sm" variant="secondary" onClick={() => setCredentialMember(row.original)}>Credencial</Button>
          {status === 'active' && (
            <Button size="sm" variant="secondary" onClick={() => handleFreeze(row.original)}>Congelar</Button>
          )}
          {status === 'frozen' && (
            <Button size="sm" variant="success" onClick={() => handleUnfreeze(row.original)}>Descongelar</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row.original)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Eliminar</Button>
        </div>
        )
      },
    },
  ]

  const getMembershipName = (id: string) => {
    const m = data.memberships.find(m => m.id === id)
    return m?.name || 'Sin membresía'
  }

  const getEndDate = (startDate: string, membershipId: string) => {
    const membership = data.memberships.find(m => m.id === membershipId)
    if (!membership || !isValidDateString(startDate)) return ''
    return addDaysToDateString(startDate, membership.durationDays)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.membershipId) return

    const endDate = getEndDate(form.startDate, form.membershipId)

    if (editingMember) {
      // Al guardar con fechas recalculadas se renueva el estado; la vigencia la decide endDate
      const status = editingMember.status === 'frozen' ? 'frozen' : 'active'
      await window.api.updateMember(editingMember.id, { ...form, endDate, status })
    } else {
      await window.api.addMember({ ...form, endDate, status: 'active' })
    }

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setEditingMember(null)
    setForm({ name: '', phone: '', email: '', membershipId: '', startDate: toLocalDateString() })
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

  const handleFreeze = async (member: Member) => {
    if (!confirm(`¿Congelar la membresía de ${member.name}? No podrá hacer check-in hasta descongelarla.`)) return
    const updated = await window.api.freezeMember(member.id)
    if (!updated) alert('No se pudo congelar la membresía')
    const newData = await window.api.getData()
    updateData(newData)
  }

  const handleUnfreeze = async (member: Member) => {
    if (!confirm(`¿Descongelar la membresía de ${member.name}? Los días congelados se agregan a su vencimiento.`)) return
    const updated = await window.api.unfreezeMember(member.id)
    if (!updated) {
      alert('No se pudo descongelar la membresía')
    } else if (updated.endDate !== member.endDate) {
      alert(`Membresía reactivada. Nuevo vencimiento: ${updated.endDate}`)
    }
    const newData = await window.api.getData()
    updateData(newData)
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
        {/* La tabla ya trae su buscador (nombre, código, teléfono, email…) */}
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowModal(true)}>
            + Nuevo Miembro
          </Button>
        </div>
        <Table data={data.members} columns={membersColumns} searchPlaceholder="Buscar por nombre, código o teléfono..." />
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

      <MemberHistory
        member={historyMember}
        data={data}
        onClose={() => setHistoryMemberId(null)}
      />

      <MemberCredential
        member={credentialMember}
        gymName={data.config.gymName}
        onClose={() => setCredentialMember(null)}
      />
    </>
  )
}
