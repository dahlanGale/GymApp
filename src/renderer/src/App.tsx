import { useState, useEffect } from 'react'
import { Layout, Dashboard, Members, Sales, SalesHistory, Products, Memberships, Entries, MembershipSales, Attendances, Config } from './components'
import { AppData, Page, SecurityStatus } from './types'
import { LockScreen } from './components/LockScreen'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  // null mientras se consulta; con contraseña la app arranca bloqueada y no carga datos hasta desbloquear
  const [security, setSecurity] = useState<SecurityStatus | null>(null)
  const locked = security?.locked ?? true

  useEffect(() => {
    window.api.getSecurityStatus()
      .then(setSecurity)
      .catch((error: unknown) => {
        console.error('Error loading security status:', error)
        setSecurity({ hasPassword: false, locked: false })
      })
  }, [])

  useEffect(() => {
    if (locked) return
    setLoading(true)
    loadData()
  }, [locked])

  // Los check-ins del kiosco y de Recepción llegan desde otras ventanas; se refresca para verlos sin recargar
  useEffect(() => {
    if (locked) return
    return window.api.onDataChanged(() => {
      window.api.getData()
        .then(setData)
        .catch((error: unknown) => console.error('Error refreshing data:', error))
    })
  }, [locked])

  const loadData = async () => {
    try {
      const appData = await window.api.getData()
      setData(appData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateData = (newData: AppData) => {
    // Los cambios ya se persistieron en el proceso main; solo se sincroniza el estado local
    setData(newData)
  }

  const handleLock = async () => {
    const status = await window.api.lock()
    setSecurity(status)
    // No se dejan los datos en memoria de la ventana mientras está bloqueada
    if (status.locked) setData(null)
  }

  if (!security) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  }

  if (security.locked) {
    return <LockScreen onUnlocked={() => setSecurity({ hasPassword: true, locked: false })} />
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <Layout page={page} setPage={setPage} onLock={security.hasPassword ? handleLock : undefined}>
      {page === 'dashboard' && data && <Dashboard data={data} />}
      {page === 'members' && data && <Members data={data} updateData={updateData} />}
      {page === 'sales' && data && <Sales data={data} updateData={updateData} />}
      {page === 'sales-history' && data && <SalesHistory data={data} />}
      {page === 'products' && data && <Products data={data} updateData={updateData} />}
      {page === 'memberships' && data && <Memberships data={data} updateData={updateData} />}
      {page === 'entries' && data && <Entries data={data} updateData={updateData} />}
      {page === 'membership-sales' && data && <MembershipSales data={data} updateData={updateData} />}
      {page === 'attendances' && data && <Attendances data={data} />}
      {page === 'config' && data && (
        <Config
          data={data}
          updateData={updateData}
          onSecurityChanged={hasPassword => setSecurity({ hasPassword, locked: false })}
        />
      )}
    </Layout>
  )
}

export default App
