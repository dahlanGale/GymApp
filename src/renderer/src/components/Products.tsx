import { useState } from 'react'
import { AppData, Product } from '../types'
import { Table, Button, Modal, Input } from './UI'
import { ColumnDef } from '@tanstack/react-table'

interface ProductsProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Products({ data, updateData }: ProductsProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', category: '', price: 0, stock: 0 })

  const filteredProducts = data.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const productsColumns: ColumnDef<Product>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'category', header: 'Categoría' },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: info => `$${(info.getValue() as number).toFixed(2)}`,
    },
    { accessorKey: 'stock', header: 'Stock' },
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

  const handleSubmit = async () => {
    if (!form.name || form.price <= 0) return

    if (editingProduct) {
      await window.api.updateProduct(editingProduct.id, form)
    } else {
      await window.api.addProduct(form)
    }

    const newData = await window.api.getData()
    updateData(newData)
    setShowModal(false)
    setEditingProduct(null)
    setForm({ name: '', category: '', price: 0, stock: 0 })
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await window.api.deleteProduct(id)
      const newData = await window.api.getData()
      updateData(newData)
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Productos</h2>
      </header>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setShowModal(true)}>
            + Nuevo Producto
          </Button>
        </div>
        <Table data={filteredProducts} columns={productsColumns} searchPlaceholder="Buscar producto..." />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
        <div className="space-y-4">
          <Input
            label="Nombre"
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Categoría"
            type="text"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
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
              label="Stock"
              type="number"
              value={form.stock}
              onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })}
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
