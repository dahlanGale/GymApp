import { useState, useEffect } from 'react'
import { Layout, Dashboard, Members, Sales, SalesHistory, Products, Memberships, Entries, MembershipSales, Attendances, Config } from './components'
import { AppData, Page } from './types'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  // Los check-ins del kiosco y de Recepción llegan desde otras ventanas; se refresca para verlos sin recargar
  useEffect(() => {
    return window.api.onDataChanged(() => {
      window.api.getData()
        .then(setData)
        .catch((error: unknown) => console.error('Error refreshing data:', error))
    })
  }, [])

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

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'dashboard' && data && <Dashboard data={data} />}
      {page === 'members' && data && <Members data={data} updateData={updateData} />}
      {page === 'sales' && data && <Sales data={data} updateData={updateData} />}
      {page === 'sales-history' && data && <SalesHistory data={data} />}
      {page === 'products' && data && <Products data={data} updateData={updateData} />}
      {page === 'memberships' && data && <Memberships data={data} updateData={updateData} />}
      {page === 'entries' && data && <Entries data={data} updateData={updateData} />}
      {page === 'membership-sales' && data && <MembershipSales data={data} updateData={updateData} />}
      {page === 'attendances' && data && <Attendances data={data} />}
      {page === 'config' && data && <Config data={data} updateData={updateData} />}
    </Layout>
  )
}

export default App
