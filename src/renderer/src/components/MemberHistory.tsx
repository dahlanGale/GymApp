import { ColumnDef } from '@tanstack/react-table'
import { AppData, Attendance, Member, MembershipSale, Sale } from '../types'
import { Badge, Modal, Table } from './UI'
import { getMemberStatus } from '../utils/dates'

interface MemberHistoryProps {
  member: Member | null
  data: AppData
  onClose: () => void
}

const formatMoney = (value: number) => `$${value.toFixed(2)}`

const STATUS_BADGES: Record<Member['status'], { variant: 'success' | 'danger' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Activo' },
  expired: { variant: 'danger', label: 'Expirado' },
  frozen: { variant: 'warning', label: 'Congelado' },
}

// La búsqueda filtra sobre el valor de la columna, así que se usa la fecha como se muestra;
// el orden sigue usando el timestamp ISO para no ordenar texto
const attendanceColumns: ColumnDef<Attendance>[] = [
  {
    id: 'timestamp',
    accessorFn: attendance => new Date(attendance.timestamp).toLocaleString(),
    header: 'Fecha y Hora',
    sortingFn: (a, b) => a.original.timestamp.localeCompare(b.original.timestamp),
  },
]

const membershipColumns: ColumnDef<MembershipSale>[] = [
  { accessorKey: 'purchaseDate', header: 'Compra' },
  { accessorKey: 'membershipName', header: 'Membresía' },
  { accessorKey: 'expirationDate', header: 'Vencimiento' },
  {
    accessorKey: 'price',
    header: 'Precio',
    cell: info => formatMoney(info.getValue() as number),
  },
]

const purchaseColumns: ColumnDef<Sale>[] = [
  {
    id: 'date',
    accessorFn: sale => new Date(sale.date).toLocaleString(),
    header: 'Fecha',
    sortingFn: (a, b) => a.original.date.localeCompare(b.original.date),
  },
  {
    id: 'items',
    accessorFn: sale => sale.items.map(item => `${item.quantity}× ${item.productName}`).join(', '),
    header: 'Productos',
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: info => formatMoney(info.getValue() as number),
  },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">{title}</h4>
      {children}
    </section>
  )
}

export function MemberHistory({ member, data, onClose }: MemberHistoryProps) {
  if (!member) return null

  const attendances = data.attendances
    .filter(a => a.memberId === member.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const membershipPurchases = data.membershipSales
    .filter(s => s.memberIds.includes(member.id))
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
  const purchases = data.sales
    .filter(s => s.memberId === member.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const membershipName = data.memberships.find(m => m.id === member.membershipId)?.name ?? 'Sin membresía'
  const status = STATUS_BADGES[getMemberStatus(member)]
  const lastAttendance = attendances[0] ? new Date(attendances[0].timestamp).toLocaleString() : 'Nunca'
  const purchasesTotal = purchases.reduce((sum, s) => sum + s.total, 0)

  return (
    <Modal open onClose={onClose} title={`Historial de ${member.name}`} size="xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Código</div>
          <div className="font-mono font-medium text-gray-900">{member.code}</div>
        </div>
        <div>
          <div className="text-gray-500">Membresía</div>
          <div className="font-medium text-gray-900">{membershipName}</div>
        </div>
        <div>
          <div className="text-gray-500">Vencimiento</div>
          <div className="font-medium text-gray-900">{member.endDate || '—'}</div>
        </div>
        <div>
          <div className="text-gray-500">Estado</div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div>
          <div className="text-gray-500">Asistencias</div>
          <div className="font-medium text-gray-900">{attendances.length}</div>
        </div>
        <div>
          <div className="text-gray-500">Última asistencia</div>
          <div className="font-medium text-gray-900">{lastAttendance}</div>
        </div>
        <div>
          <div className="text-gray-500">Membresías compradas</div>
          <div className="font-medium text-gray-900">{membershipPurchases.length}</div>
        </div>
        <div>
          <div className="text-gray-500">Total en productos</div>
          <div className="font-medium text-gray-900">{formatMoney(purchasesTotal)}</div>
        </div>
      </div>

      <Section title={`Asistencias (${attendances.length})`}>
        <Table data={attendances} columns={attendanceColumns} searchPlaceholder="Buscar fecha..." />
      </Section>

      <Section title={`Membresías Compradas (${membershipPurchases.length})`}>
        <Table data={membershipPurchases} columns={membershipColumns} searchPlaceholder="Buscar membresía..." />
      </Section>

      <Section title={`Compras de Productos (${purchases.length})`}>
        <Table data={purchases} columns={purchaseColumns} searchPlaceholder="Buscar producto..." />
      </Section>
    </Modal>
  )
}
