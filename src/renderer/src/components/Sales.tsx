import { useState } from 'react'
import { AppData, Product } from '../types'

interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

interface SalesProps {
  data: AppData
  updateData: (d: AppData) => void
}

export function Sales({ data, updateData }: SalesProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')

  const filteredProducts = data.products.filter(p =>
    p.stock > 0 && (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id)
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1
      }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.productId === productId)
    if (!item) return
    const product = data.products.find(p => p.id === productId)
    if (!product) return

    const newQty = item.quantity + delta
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId))
    } else if (newQty <= product.stock) {
      setCart(cart.map(i =>
        i.productId === productId ? { ...i, quantity: newQty } : i
      ))
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSale = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0) return

    const member = data.members.find(m => m.id === selectedMemberId)

    await window.api.addSale({
      memberId: selectedMemberId || null,
      memberName: member?.name || null,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      })),
      total: cartTotal,
      paymentMethod,
      date: new Date().toISOString()
    })

    const newData = await window.api.getData()
    updateData(newData)
    setCart([])
    setSelectedMemberId('')
    alert('Venta procesada correctamente!')
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h2>Punto de Venta</h2>
      </header>
      <div className="p-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          <div className="flex-1 overflow-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
                  onClick={() => addToCart(product)}
                >
                  <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                  <div className="text-sm text-gray-500">{product.category}</div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">${product.price.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Stock: {product.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full md:w-80 lg:w-96 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-fit max-h-full">
            <div className="p-4 border-b border-gray-200">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Cliente (opcional)
              </label>
              <select 
                value={selectedMemberId} 
                onChange={e => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Cliente General</option>
                {data.members.filter(m => m.status === 'active').map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div className="p-4 border-b border-gray-200">
              <h3>Carrito</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <span className="text-sm text-gray-500">${item.price.toFixed(2)} c/u</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-700"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button 
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-700"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-semibold mb-4">
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSale('card')}
                  disabled={cart.length === 0}
                >
                  Tarjeta
                </button>
                <button 
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSale('cash')}
                  disabled={cart.length === 0}
                >
                  Efectivo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
