import { useState, useEffect } from 'react'
import { Layout, Dashboard, Members, Sales, Products, Memberships, Entries, MembershipSales, Config } from './components'
import { AppData, Page } from './types'

declare global {
  interface Window {
    api: {
      getData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<void>
      addMember: (member: Omit<import('./types').Member, 'id' | 'createdAt'>) => Promise<import('./types').Member>
      updateMember: (id: string, member: Partial<import('./types').Member>) => Promise<void>
      deleteMember: (id: string) => Promise<void>
      addMembership: (membership: Omit<import('./types').Membership, 'id'>) => Promise<import('./types').Membership>
      updateMembership: (id: string, membership: Partial<import('./types').Membership>) => Promise<void>
      deleteMembership: (id: string) => Promise<void>
      addProduct: (product: Omit<import('./types').Product, 'id'>) => Promise<import('./types').Product>
      updateProduct: (id: string, product: Partial<import('./types').Product>) => Promise<void>
      deleteProduct: (id: string) => Promise<void>
      addSale: (sale: Omit<import('./types').Sale, 'id'>) => Promise<import('./types').Sale>
      addEntry: (entry: Omit<import('./types').Entry, 'id'>) => Promise<import('./types').Entry>
      addMembershipSale: (sale: Omit<import('./types').MembershipSale, 'id'>) => Promise<import('./types').MembershipSale>
      updateConfig: (config: import('./types').BusinessConfig) => Promise<void>
      importData: (data: Partial<AppData>) => Promise<AppData>
      importCsv: (csvData: { type: 'members' | 'products' | 'memberships', data: string }) => Promise<AppData>
      searchMemberByCode: (code: string) => Promise<import('./types').Member | null>
      recordAttendance: (memberId: string) => Promise<{ attendance: import('./types').Attendance, member: import('./types').Member }>
      openCheckInWindow: () => Promise<void>
    }
  }
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
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
    setData(newData)
    window.api.saveData(newData)
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'dashboard' && data && <Dashboard data={data} />}
      {page === 'members' && data && <Members data={data} updateData={updateData} />}
      {page === 'sales' && data && <Sales data={data} updateData={updateData} />}
      {page === 'products' && data && <Products data={data} updateData={updateData} />}
      {page === 'memberships' && data && <Memberships data={data} updateData={updateData} />}
      {page === 'entries' && data && <Entries data={data} updateData={updateData} />}
      {page === 'membership-sales' && data && <MembershipSales data={data} updateData={updateData} />}
      {page === 'config' && data && <Config data={data} updateData={updateData} />}
    </Layout>
  )
}

export default App
