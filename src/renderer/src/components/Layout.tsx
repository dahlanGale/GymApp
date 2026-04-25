import { Page } from '../types'

interface LayoutProps {
  page: Page
  setPage: (page: Page) => void
  children: React.ReactNode
}

export function Layout({ page, setPage, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-slate-800 text-white flex flex-col py-4">
        <div className="px-4 pb-6 border-b border-white/10 mb-4">
          <h1 className="text-xl font-bold text-emerald-500">GymPOS</h1>
        </div>
        <nav className="flex-1">
          <NavItem 
            active={page === 'dashboard'} 
            onClick={() => setPage('dashboard')}
            icon={<DashboardIcon />}
          >
            Dashboard
          </NavItem>
          <NavItem 
            active={page === 'members'} 
            onClick={() => setPage('members')}
            icon={<MembersIcon />}
          >
            Miembros
          </NavItem>
          <NavItem 
            active={page === 'sales'} 
            onClick={() => setPage('sales')}
            icon={<SalesIcon />}
          >
            Ventas
          </NavItem>
          <NavItem 
            active={page === 'products'} 
            onClick={() => setPage('products')}
            icon={<ProductsIcon />}
          >
            Productos
          </NavItem>
          <NavItem 
            active={page === 'memberships'} 
            onClick={() => setPage('memberships')}
            icon={<CalendarIcon />}
          >
            Membresías
          </NavItem>
          <NavItem 
            active={page === 'entries'} 
            onClick={() => setPage('entries')}
            icon={<EntryIcon />}
          >
            Entradas
          </NavItem>
          <NavItem 
            active={page === 'membership-sales'} 
            onClick={() => setPage('membership-sales')}
            icon={<CardIcon />}
          >
            Venta Membresías
          </NavItem>
          <NavItem 
            active={page === 'config'} 
            onClick={() => setPage('config')}
            icon={<SettingsIcon />}
          >
            Configuración
          </NavItem>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}

function NavItem({ active, onClick, icon, children }: { 
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div 
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-3 hover:bg-white/5 ${active ? 'bg-white/10 text-white border-l-emerald-500' : 'text-white/70'}`} 
      onClick={onClick}
    >
      <span className="w-5 h-5">{icon}</span>
      {children}
    </div>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function MembersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SalesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function EntryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8V21H3V8" />
      <path d="M23 3H1V8H23V3Z" />
      <path d="M10 12H14" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  )
}
