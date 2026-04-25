import { useState } from 'react'
import { AppData, BusinessConfig } from '../types'
import { Button, Card, Input } from './UI'

interface ConfigProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Config({ data, updateData }: ConfigProps) {
  const [form, setForm] = useState<BusinessConfig>(data.config)
  const [importing, setImporting] = useState(false)
  const [importType, setImportType] = useState<'members' | 'products' | 'memberships'>('members')

  const handleSave = async () => {
    await window.api.updateConfig(form)
    const newData = await window.api.getData()
    updateData(newData)
    alert('Configuración guardada correctamente')
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-pos-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const importedData = JSON.parse(text)
      
      const newData = await window.api.importData(importedData)
      updateData(newData)
      alert('Datos importados correctamente')
    } catch (error) {
      alert('Error al importar datos. Verifique el formato del archivo.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      
      const newData = await window.api.importCsv({ type: importType, data: text })
      updateData(newData)
      alert(`${importType === 'members' ? 'Miembros' : importType === 'products' ? 'Productos' : 'Membresías'} importados correctamente`)
    } catch (error) {
      alert('Error al importar datos. Verifique el formato del archivo CSV.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Configuración</h2>
      </header>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Datos del Negocio</h3>
            <div className="space-y-4">
              <Input
                label="Nombre del Gym"
                type="text"
                value={form.gymName}
                onChange={e => setForm({ ...form, gymName: e.target.value })}
              />
              <Input
                label="Dirección"
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
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
              <Button onClick={handleSave}>
                Guardar Configuración
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Reglas del Negocio</h3>
            <div className="space-y-4">
              <Input
                label="Costo de Mantenimiento Anual ($)"
                type="number"
                step="0.01"
                value={form.annualMaintenanceCost}
                onChange={e => setForm({ ...form, annualMaintenanceCost: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este monto se agregará a las membresías que incluyan mantenimiento anual
              </p>
              <Button onClick={handleSave}>
                Guardar Reglas
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Importar / Exportar Datos</h3>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Exportar</h4>
              <p className="text-xs text-gray-500 mb-3">
                Descarga todos los datos del sistema (completo)
              </p>
              <Button variant="secondary" onClick={handleExport}>
                Exportar Todo (JSON)
              </Button>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Importar</h4>
              <p className="text-xs text-gray-500 mb-3">
                Importa datos desde archivo JSON (completo)
              </p>
              <label className="inline-block cursor-pointer">
                <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  {importing ? 'Importando...' : 'Importar Todo (JSON)'}
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Importar desde CSV</h3>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona el tipo de datos a importar y carga un archivo CSV
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de datos a importar</label>
              <select value={importType} onChange={e => setImportType(e.target.value as 'members' | 'products' | 'memberships')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="members">Miembros</option>
                <option value="products">Productos</option>
                <option value="memberships">Membresías</option>
              </select>
            </div>

            <label className="inline-block cursor-pointer mb-4">
              <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                {importing ? 'Importando...' : `Importar ${importType === 'members' ? 'Miembros' : importType === 'products' ? 'Productos' : 'Membresías'} (CSV)`}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
                disabled={importing}
              />
            </label>

            <h4 className="text-sm font-medium text-gray-700 mb-2 mt-4">Formatos CSV:</h4>
            
            {importType === 'members' && (
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
{`name,phone,email,membershipid,startdate,enddate,status
Juan Perez,1234567890,juan@email.com,1,2026-01-01,2026-12-31,active
Maria Lopez,0987654321,maria@email.com,2,2026-01-15,2026-04-15,active`}
              </pre>
            )}

            {importType === 'products' && (
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
{`name,category,price,stock
Proteina,Suplementos,350,20
Creatina,Suplementos,250,30
Pre-entreno,Suplementos,300,15`}
              </pre>
            )}

            {importType === 'memberships' && (
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
{`name,price,durationdays,haspromotion,promotiontype,promotiondiscount,includesannualmaintenance
Mensual,500,30,false,,0,false
Trimestral,1300,90,true,new_client,100,false
Anual,4500,365,true,no_maintenance,200,true`}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
